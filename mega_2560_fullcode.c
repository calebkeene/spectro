#include <util/delay_basic.h>

#define RD (1<<0)
#define CNVST (1<<2)
#define BYTESWAP (1<<3)
#define ICG (1<<4)
#define SH (1<<5)
#define MCLK (1<<6)

// Full frame, including dark pixels
// and dead pixels.
#define PIXEL_COUNT 3800

#define CLOCKS PORTF // Pins A0 to A7 (1 byte of data)
#define CLOCKS_DDR DDRF // PORTF data direction register
#define DATA_PINS PINK
#define DATA_PORT PORTK// pins A8 to A15 

/* DDR is data direction register - the DDR bit corresponding to the OCnA pin needs
* to be set to enable the output driver and thus to have a clock output on the pin
* the OCnx setup should be done before setting the DDR for the port pin to output
*/
#define DATA_DDR DDRK

// 10mS exposure time.
#define EXPOSURE_TIME 1

// Initial clock state.
uint8_t clocks0 = (RD + CNVST + ICG);

// 16-bit pixel buffer
uint16_t pixelBuffer[PIXEL_COUNT];

/*
 * startLine() Toggles the clocks to shift the line
 * into the CCD shift register.
 */

void startLine()
{
  // Set ICG low.
  CLOCKS &= ~ICG;
  _delay_loop_1(5);

  // Set SH high.
  CLOCKS |= SH;
  _delay_loop_1(5); // 10uS. -no, should be 0.9374uS (1/16MHz)*5*3 = 9.375e-7

  // Set SH low.
  CLOCKS &= ~SH;
  _delay_loop_1(10);

  // Set ICG high.
  CLOCKS |= ICG;
}

/*
 * readLine() Reads all pixels into a buffer.
 */
 
void readLine()
{
  // Get an 8-bit pointer to the 16-bit buffer.
  uint8_t * buf = (uint8_t *)pixelBuffer;
  int x;

  cli();// disable all interrupts (clear global interrupt mask)

  CLOCKS |= (RD + CNVST + ICG + BYTESWAP + SH);
  OCR2A = 5;
  TCNT2 = 0;
  PORTB &= ~0x02;
  
  for (x = 0; x < PIXEL_COUNT; ++x){
    CLOCKS ^= SH;
    CLOCKS &= ~CNVST;
    CLOCKS |= CNVST;

    /* this function takes an unsigned int and delays by that number of counts (uses an 8-bit counter),
    * so max count of 255. executes 3 clock cycles per count value ( so max delay = 256*3*T_CLK ) - 
    * in this case F_CLK is 16MHz, so T_CLK = 62.5ns, so max delay = 48us 
    */
    _delay_loop_1(4);
    

    //assembly language nop call ('no operation') - each of these delays executes in one machine cycle (1 clock period delay)
    // can stack 3 like this instead:     __asm__("nop\n\t""nop\n\t""nop\n\t"); = 3 clock periods of delay
    __asm__("nop\n\t");
    __asm__("nop\n\t");
    __asm__("nop\n\t");
    CLOCKS ^= SH;
    CLOCKS &= ~(RD);
    *buf++ = DATA_PINS;
    CLOCKS &= ~(BYTESWAP);
    *buf++ = DATA_PINS;
    CLOCKS |= (RD + BYTESWAP);
  }
  sei(); // re-enables interrupts by setting the global interrupt mask again
}



/*
 * sendLine() Send the line of pixels to the user.
 */
void sendLine()
{
  //unsigned long startTime = millis();
  int x;
  Serial.write(1); // tell readings_controller we're starting the send
  for (x = 0; x < PIXEL_COUNT; ++x)
  {
    uint16_t fullbyte = pixelBuffer[x];
    uint8_t lowbyte = fullbyte & 0xff;
    uint8_t highbyte = (fullbyte >> 8);
    Serial.write(lowbyte);
    Serial.write(highbyte);
  }
//  unsigned long endTime = millis();
//  Serial.print("Time: ");
//  Serial.println(endTime - startTime);
}

/*
 * cleanLine() Performs voodoo on the data.
 * Looks for shot noise and replaces it with
 * the previous pixel data. You might want to
 * skip this if doing serious science. The blip
 * might be your data.
 */

/*
 * setup()
 * Set the data port to input.
 * Set the clock port to output.
 * Start timer2 generating the Mclk signal
 * Set the pullup on pin 2 for the start switch.
 */
 
 void setup() {
  CLOCKS_DDR = 0xff;
  CLOCKS = clocks0;
  DATA_DDR = 0x0;
  Serial.begin(460800);

  // TCCR2A = 0100 0010
  // toggle OC2A on compare match, mode 2 (CTC)
  TCCR2A =  (0 << COM2A1) | (1 << COM2A0) | (1 << WGM21) | (0 << WGM20);
  
  //clear WGM2 bit (last bit used for setting CTC mode), set CS20 for system clock with no prescaling (16MHz)
  TCCR2B = (0 << WGM22) | (1 << CS20);

  // waveform generator bits [WGM22, WGM21, WGM20] not set to [0, 1, 0], which sets the timer in CTC mode
  
  // page 172 of datasheet - formula for setting frequency of operation in CTC mode
  OCR2A = 5;

  // reset count of timer 2
  TCNT2 = 0;
  
  // Output Mclk on D10
  DDRB |= 0x10;

  // For the trigger switch.
  pinMode(2, INPUT_PULLUP);
}
/*
 * loop()
 * Read the CCD continuously.
 * Upload to user on switch press.
 */
 
void loop() {

  startLine();
  readLine();
  delay(EXPOSURE_TIME);
  if (!digitalRead(2) || Serial.read()=='a')
  {
    //cleanLine();
    sendLine();
  }
}
                
