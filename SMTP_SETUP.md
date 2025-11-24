# SMTP Setup for OTP Email Sending

To enable OTP email functionality, you need to configure your SMTP settings in your environment variables.

## Environment Variables

Add the following to your `.env` file:

```bash
# SMTP Configuration for OTP emails
SMTP_HOST=your_smtp_host              # e.g., smtp.gmail.com
SMTP_PORT=587                         # Port for TLS (587) or SSL (465)
SMTP_SECURE=false                     # true for port 465, false for port 587
SMTP_USER=your_email@example.com      # Your email address
SMTP_PASS=your_email_password         # Your email password or app-specific password
SMTP_FROM=your_email@example.com      # Sender email address (usually same as SMTP_USER)
```

## Gmail Example

For Gmail, use these settings:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM=your_gmail_address@gmail.com
```

Note: For Gmail, you need to generate an App Password instead of using your regular password:
1. Enable 2-Factor Authentication on your Google account
2. Go to your Google Account settings
3. Navigate to Security > App passwords
4. Generate a new app password for "Mail"
5. Use this app password as your SMTP_PASS

## Other Email Providers

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_outlook_address@outlook.com
SMTP_PASS=your_password
SMTP_FROM=your_outlook_address@outlook.com
```

### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_yahoo_address@yahoo.com
SMTP_PASS=your_app_password
SMTP_FROM=your_yahoo_address@yahoo.com
```

Note: For Yahoo, you need to generate an App Password similar to Gmail.

## Testing SMTP Configuration

After setting up your environment variables, restart your server and test the OTP functionality by entering an email address in the authentication flow.