'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('로그인 성공');
    router.push('/');
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error('이메일을 입력하세요.');
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('매직 링크를 이메일로 전송했습니다.');
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">이메일</label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">비밀번호</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="mt-2 h-11 w-full text-sm" disabled={loading}>
              {loading ? '로그인 중...' : '이메일 / 비밀번호 로그인'}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full text-sm"
              onClick={handleMagicLink}
              disabled={loading}
            >
              매직 링크 이메일 보내기
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

