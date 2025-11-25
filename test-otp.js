const axios = require('axios');

// Test OTP functionality
const BASE_URL = 'http://localhost:3000/api';

async function testOTPSend() {
  try {
    console.log('Testing OTP send...');
    
    const response = await axios.post(`${BASE_URL}/otp/send`, {
      email: 'iambroke954@gmail.com'
    });
    
    console.log('✅ OTP Send Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ OTP Send Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    if (error.request) {
      console.error('Request Data:', error.request);
    }
    return null;
  }
}

async function testOTPVerify(otp) {
  try {
    console.log('Testing OTP verify...');
    
    const response = await axios.post(`${BASE_URL}/otp/verify`, {
      email: 'iambroke954@gmail.com',
      otp: otp
    });
    
    console.log('✅ OTP Verify Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ OTP Verify Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    if (error.request) {
      console.error('Request Data:', error.request);
    }
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting OTP Tests...\n');
  
  // Test 1: Send OTP
  const sendResult = await testOTPSend();
  if (!sendResult) {
    console.log('❌ Failed to send OTP');
    return;
  }
  
  // For testing purposes, you can manually enter the OTP from the console logs
  console.log('\n📋 To test OTP verification:');
  console.log('1. Check your email for the OTP code');
  console.log('2. Run: node test-otp-verify.js <otp_code>');
}

if (require.main === module) {
  runTests();
}

module.exports = { testOTPSend, testOTPVerify };