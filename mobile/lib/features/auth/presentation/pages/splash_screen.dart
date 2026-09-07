import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/navigation/role_navigation.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';

/// Halaman pertama yang dibuka app. Tugasnya cuma satu: cari tau user
/// ini udah login atau belum (lewat token tersimpan), lalu lempar ke
/// tempat yang tepat -- LoginScreen kalau belum, atau home sesuai role
/// (lewat RoleNavigation) kalau udah.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // addPostFrameCallback biar aman manggil Navigator/ref setelah
    // frame pertama selesai di-build.
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkAuth());
  }

  Future<void> _checkAuth() async {
    await ref.read(authProvider.notifier).tryAutoLogin();
    if (!mounted) return;

    final state = ref.read(authProvider);

    final Widget target = (state.isLoggedIn && state.user != null)
        ? await RoleNavigation.resolveHomeScreen(ref, state.user!)
        : const LoginScreen();

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => target),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFEEF1F7),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'CFD Hub',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1C3F7C),
              ),
            ),
            SizedBox(height: 16),
            CircularProgressIndicator(color: Color(0xFF1C3F7C)),
          ],
        ),
      ),
    );
  }
}