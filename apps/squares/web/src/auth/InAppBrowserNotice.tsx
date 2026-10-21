import { ContentCopy, OpenInBrowser } from '@mui/icons-material';
import { Alert, Box, Button } from '@mui/material';
import { useState } from 'react';
import { chromeIntentUrl, isAndroid, isInAppBrowser } from './inAppBrowser';

// Google blocks sign-in inside an app's built-in browser, so point the visitor to a real one first
export default function InAppBrowserNotice() {
  const [copied, setCopied] = useState(false);

  if (!isInAppBrowser()) {
    return null;
  }

  const href = window.location.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Alert severity="warning" sx={{ textAlign: 'left' }}>
      Google sign-in doesn&apos;t work inside this app&apos;s browser. Open this page in Safari or
      Chrome to sign in with Google, or use GitHub here.
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
        {isAndroid() && (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<OpenInBrowser />}
            href={chromeIntentUrl(href)}
          >
            Open in Chrome
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<ContentCopy />}
          onClick={copy}
        >
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </Box>
    </Alert>
  );
}
