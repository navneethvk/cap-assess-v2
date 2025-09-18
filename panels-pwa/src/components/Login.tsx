import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { notify } from '../utils/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      notify.success('Logged in successfully!');
      navigate('/');
    } catch (err) {
      if (err instanceof Error) {
        notify.error(err.message);
      } else {
        notify.error('An unknown error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-center">
        <div className="text-center lg:text-left order-2 lg:order-1 px-2 sm:px-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight modern-gradient-text">CCI Assessment</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 sm:mt-6">Your healthcare management portal</p>
        </div>
        <div className="order-1 lg:order-2 flex justify-center">
          <Card className="w-full max-w-sm modern-border">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 sm:h-11"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button className="w-full mt-6 h-10 sm:h-11" onClick={handleLogin}>
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                New user? {' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Create account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
