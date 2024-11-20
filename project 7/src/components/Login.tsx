import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const { login, sendVerificationEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      
      if (message.includes('verify your email')) {
        setNeedsVerification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      await sendVerificationEmail(email);
      setError('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError('Failed to send verification email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-6 text-center pb-12">
          <div>
            <h1 className="brand-title text-5xl mb-3">CardQuant</h1>
            <p className="text-muted-foreground">Inventory Management System</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant={needsVerification ? "warning" : "destructive"}>
                <AlertDescription>
                  {error}
                  {needsVerification && (
                    <Button
                      variant="link"
                      className="ml-2"
                      onClick={handleResendVerification}
                      disabled={isLoading}
                    >
                      Resend verification email
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : 'Login'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Admin: admin@example.com / admin123</p>
              <p>Manager: manager@example.com / manager123</p>
              <p>Streamer: streamer1@example.com / streamer123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}