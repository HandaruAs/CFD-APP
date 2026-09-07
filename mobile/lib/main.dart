import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/presentation/pages/splash_screen.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/pages/register_screen.dart';
import 'package:mobile/core/routers/app_router.dart';
import 'package:mobile/core/themes/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CFD Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      // SplashScreen yang decide tujuan awal (LoginScreen atau home
      // sesuai role) lewat auto-login -- bukan hardcode ke '/login'
      // lagi kayak sebelumnya.
      home: const SplashScreen(),
      // '/login' & '/register' tetap didaftarin buat jaga-jaga kalau
      // ada tempat lain yang mau navigasi pakai named route (mis.
      // Navigator.pushNamedAndRemoveUntil setelah logout paksa dari
      // luar splash flow).
      routes: {
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
      },
      // Semua path lain (menu drawer pedagang & petugas, dst) lewat
      // sini -- satu-satunya sumber kebenaran "path -> halaman apa"
      // ada di AppRouter.generateRoute, bukan hardcode di widget lain.
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}