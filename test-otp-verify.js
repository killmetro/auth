const { testOTPVerify } = require('./test-otp');

async function runVerifyTest(otp) {
  if (!otp) {
    console.log('Usage: node test-otp-verify.js <otp_code>');
    console.log('Example: node test-otp-verify.js 123456');
    return;
  }
  
  console.log(`Testing OTP verification with code: ${otp}`);
  await testOTPVerify(otp);
}

// Get OTP from command line arguments
const otp = process.argv[2];
runVerifyTest(otp);