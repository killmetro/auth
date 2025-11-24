const { SMTPClient } = require('smtp-client');

// Load environment variables
require('dotenv').config();

async function testSMTP() {
  console.log('Testing SMTP connection...');
  
  // Check if SMTP configuration exists
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP configuration missing in .env file');
    console.log('Please ensure you have the following in your .env file:');
    console.log('SMTP_HOST=smtp-mail.outlook.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
    console.log('SMTP_USER=your_email@outlook.com');
    console.log('SMTP_PASS=your_password');
    console.log('SMTP_FROM=your_email@outlook.com');
    return;
  }

  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT || 587}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  
  const client = new SMTPClient({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    ignoreTLS: process.env.SMTP_SECURE === 'true' ? false : true
  });

  try {
    console.log('Connecting to SMTP server...');
    await client.connect();
    console.log('✅ Connected to SMTP server');
    
    console.log('Sending greeting...');
    await client.greet({hostname: 'localhost'});
    console.log('✅ Greeting sent');
    
    console.log('Authenticating...');
    await client.authPlain({
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS
    });
    console.log('✅ Authentication successful');
    
    console.log('Testing email sending...');
    await client.mail({from: process.env.SMTP_FROM || process.env.SMTP_USER});
    
    // For turbo-smtp, we need to use a valid email address
    // Let's use a test email address
    const testEmail = 'test@example.com';
    await client.rcpt({to: testEmail});
    
    const emailContent = `From: ${process.env.SMTP_FROM || process.env.SMTP_USER}\r
To: ${testEmail}\r
Subject: SMTP Test\r
\r
This is a test email from your SMTP configuration.`;
    await client.data(emailContent);
    console.log('✅ Email sent successfully');
    
    await client.quit();
    console.log('✅ Disconnected from SMTP server');
    console.log('🎉 All tests passed! SMTP is working correctly.');
    
  } catch (error) {
    console.error('❌ SMTP Test Failed:', error.message);
    console.error('Error Details:', error);
    await client.quit().catch(() => {});
  }
}

testSMTP();