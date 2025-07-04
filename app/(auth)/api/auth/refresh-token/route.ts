import { registerIfNotExists } from '@/app/(auth)/actions';
import { signIn, signOut } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';
  const brandId = searchParams.get('shop') ?? searchParams.get('brandid') ?? '';

  if (!brandId) {
    return NextResponse.error();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token && token.email === brandId) {
    const decodedRedirectUrl = decodeURIComponent(redirectUrl);
    return NextResponse.redirect(decodedRedirectUrl);
  }

  if (token && token.email !== brandId) {
    await signOut({ redirect: false });
  }

  try {
    await registerIfNotExists({
      email: brandId,
      password: brandId,
    });
  } catch (error) {
    console.error(error);
  }

  const signInResult = await signIn('credentials', {
    email: brandId,
    password: brandId,
    redirect: false,
  });

  if (signInResult?.error) {
    console.error('User sign in failed:', signInResult.error);
    return NextResponse.error();
  }

  const decodedRedirectUrl = decodeURIComponent(redirectUrl);
  return NextResponse.redirect(decodedRedirectUrl);
}
