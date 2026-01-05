import { Box, Container, Paper, Typography, Divider, Stack } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';

interface StorageData {
  key: string;
  value: string;
}

export default function DebugPage() {
  const auth = useAuth();
  const [localStorageData, setLocalStorageData] = useState<StorageData[]>([]);
  const [sessionStorageData, setSessionStorageData] = useState<StorageData[]>([]);
  const [cookiesData, setCookiesData] = useState<StorageData[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Update time every second for countdown
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get localStorage data
    const localData: StorageData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localData.push({
          key,
          value: localStorage.getItem(key) || '',
        });
      }
    }
    setLocalStorageData(localData);

    // Get sessionStorage data
    const sessionData: StorageData[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionData.push({
          key,
          value: sessionStorage.getItem(key) || '',
        });
      }
    }
    setSessionStorageData(sessionData);

    // Get cookies
    const cookiesArray: StorageData[] = document.cookie
      .split(';')
      .map((cookie) => {
        const [key, ...valueParts] = cookie.trim().split('=');
        return {
          key: key.trim(),
          value: valueParts.join('='),
        };
      })
      .filter((c) => c.key);
    setCookiesData(cookiesArray);
  }, []);

  const renderStorageSection = (title: string, data: StorageData[]) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        {title} ({data.length} items)
      </Typography>
      <Paper sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
        {data.length === 0 ? (
          <Typography color="text.secondary">No items found</Typography>
        ) : (
          <Stack spacing={2}>
            {data.map((item, index) => (
              <Box key={index}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'secondary.main',
                    fontWeight: 'bold',
                    mb: 0.5,
                    wordBreak: 'break-all',
                  }}
                >
                  {item.key}
                </Typography>
                <Paper
                  sx={{
                    p: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    wordBreak: 'break-all',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
                  >
                    {item.value}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        🐛 Debug Page
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page displays all authentication and storage information for debugging purposes.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Auth Information */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          Authentication Status
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          <Stack spacing={1}>
            <Typography>
              <strong>Is Authenticated:</strong> {auth.isAuthenticated ? '✅ Yes' : '❌ No'}
            </Typography>
            <Typography>
              <strong>Is Loading:</strong> {auth.isLoading ? 'Yes' : 'No'}
            </Typography>
            <Typography>
              <strong>Active Navigator:</strong> {auth.activeNavigator || 'None'}
            </Typography>
            <Typography>
              <strong>Has Error:</strong> {auth.error ? `Yes - ${auth.error.message}` : 'No'}
            </Typography>
            {auth.user?.expires_at && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography>
                  <strong>Current Time:</strong> {new Date(currentTime).toLocaleString()}
                </Typography>
                <Typography>
                  <strong>Token Expires At:</strong>{' '}
                  {new Date(auth.user.expires_at * 1000).toLocaleString()}
                </Typography>
                <Typography>
                  <strong>Time Remaining:</strong>{' '}
                  {(() => {
                    const now = Math.floor(currentTime / 1000);
                    const expiresAt = auth.user.expires_at;
                    const remainingSeconds = expiresAt - now;

                    if (remainingSeconds <= 0) {
                      return '⚠️ Expired';
                    }

                    const hours = Math.floor(remainingSeconds / 3600);
                    const minutes = Math.floor((remainingSeconds % 3600) / 60);
                    const seconds = remainingSeconds % 60;

                    return `${hours}h ${minutes}m ${seconds}s`;
                  })()}
                </Typography>
              </>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* User Information */}
      {auth.user && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            User Information
          </Typography>
          <Paper sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(auth.user, null, 2)}
            </Typography>
          </Paper>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Storage Information */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Storage Information
      </Typography>

      {renderStorageSection('Local Storage', localStorageData)}
      {renderStorageSection('Session Storage', sessionStorageData)}
      {renderStorageSection('Cookies', cookiesData)}
    </Container>
  );
}
