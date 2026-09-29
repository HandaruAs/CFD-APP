import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/auth/presentation/pages/reset_password_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_form_layout.dart';

/// Lupa Kata Sandi -- langkah 2 dari 3: masukkan kode OTP 6 digit dari
/// email. Kalau benar, backend kasih reset token -> lanjut ke halaman
/// kata sandi baru. Kode berlaku 10 menit (diatur di backend).
class VerifyOtpScreen extends StatefulWidget {
  final String email;

  const VerifyOtpScreen({super.key, required this.email});

  @override
  State<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends State<VerifyOtpScreen> {
  // Jeda sebelum boleh kirim ulang kode -- sama dengan web (60 detik).
  static const _resendSeconds = 60;

  // Panjang kode OTP & lama angka terakhir ditampilkan sebelum jadi "*".
  static const _otpLength = 6;
  static const _revealDuration = Duration(seconds: 1);

  final _otpController = TextEditingController();
  final _otpFocus = FocusNode();

  // Index kotak yang angkanya sedang ditampilkan (null = semua tertutup).
  int? _revealIndex;
  Timer? _revealTimer;

  bool _loading = false;
  bool _resending = false;
  String? _error;
  String? _info;

  int _secondsLeft = _resendSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    // Timer WAJIB dimatikan, kalau tidak dia tetap jalan setelah
    // halaman ditutup dan memanggil setState di widget yang sudah hilang.
    _timer?.cancel();
    _revealTimer?.cancel();
    _otpController.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  /// Mulai hitung mundur dari [_resendSeconds]. Nilai awal di-set di
  /// luar setState supaya aman dipanggil dari initState.
  void _startCountdown() {
    _timer?.cancel();
    _secondsLeft = _resendSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsLeft <= 1) {
        timer.cancel();
        setState(() => _secondsLeft = 0);
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  /// Dipanggil tiap isi kode berubah. Angka yang BARU diketik ditampilkan
  /// sebentar ([_revealDuration]), setelah itu berubah jadi "*".
  void _onOtpChanged(String value) {
    _revealTimer?.cancel();

    setState(() {
      _error = null;
      // Nambah angka -> tampilkan angka terakhir. Hapus angka -> tutup semua.
      _revealIndex = value.isEmpty ? null : value.length - 1;
    });

    if (value.isNotEmpty) {
      _revealTimer = Timer(_revealDuration, () {
        if (mounted) setState(() => _revealIndex = null);
      });
    }

    // Semua kotak terisi -> langsung verifikasi, gak perlu tekan tombol.
    if (value.length == _otpLength && !_loading) {
      _handleVerify();
    }
  }

  Future<void> _handleVerify() async {
    if (_otpController.text.length != _otpLength) {
      setState(() => _error = 'Kode OTP harus $_otpLength digit.');
      _otpFocus.requestFocus();
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });

    try {
      final resetToken = await AuthRemoteDatasource.verifyOtp(
        email: widget.email,
        otp: _otpController.text.trim(),
      );

      if (!mounted) return;

      // pushReplacement: kode OTP sudah terpakai, jadi halaman ini gak
      // perlu bisa dibuka lagi lewat tombol kembali.
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ResetPasswordScreen(resetToken: resetToken),
        ),
      );
    } on ApiException catch (e) {
      // Kode salah/kadaluarsa -> kosongkan kotak biar bisa langsung ketik ulang.
      _otpController.clear();
      _revealTimer?.cancel();
      setState(() {
        _error = e.message;
        _revealIndex = null;
      });
      // Fokus diminta setelah frame berikutnya, saat kotak sudah aktif
      // lagi (selama loading kotaknya dinonaktifkan).
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _otpFocus.requestFocus();
      });
    } catch (_) {
      setState(() => _error = 'Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleResend() async {
    if (_secondsLeft > 0 || _resending) return;

    setState(() {
      _resending = true;
      _error = null;
      _info = null;
    });

    try {
      await AuthRemoteDatasource.forgotPassword(email: widget.email);
      if (!mounted) return;
      _otpController.clear();
      _revealTimer?.cancel();
      setState(() {
        _revealIndex = null;
        _info = 'Kode baru sudah dikirim ke email Anda.';
        _startCountdown();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = _loading || _resending;

    return AuthFormLayout(
      headerTitle: 'Verifikasi Kode',
      headerSubtitle: 'Cek email Anda untuk\nmelihat kode verifikasi',
      onBack: () => Navigator.of(context).pop(),
      heading: 'Masukkan Kode OTP',
      description: 'Kode 6 digit sudah dikirim ke ${widget.email}. '
          'Kode berlaku 10 menit.',
      children: [
        if (_error != null) ...[
          AuthErrorBanner(message: _error!),
          const SizedBox(height: 16),
        ],
        if (_info != null) ...[
          _InfoBanner(message: _info!),
          const SizedBox(height: 16),
        ],
        _OtpBoxes(
          controller: _otpController,
          focusNode: _otpFocus,
          length: _otpLength,
          revealIndex: _revealIndex,
          enabled: !busy,
          onChanged: _onOtpChanged,
        ),
        const SizedBox(height: 28),
        AuthPrimaryButton(
          label: 'Verifikasi',
          loading: _loading,
          onPressed: _resending ? null : _handleVerify,
        ),
        const SizedBox(height: 20),
        Center(
          child: _secondsLeft > 0
              ? Text(
                  'Kirim ulang kode dalam $_secondsLeft detik',
                  style: const TextStyle(color: Colors.black54),
                )
              : TextButton(
                  onPressed: busy ? null : _handleResend,
                  child: Text(
                    _resending ? 'Mengirim...' : 'Kirim ulang kode',
                    style: const TextStyle(
                      color: kBrandColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

/// Kotak info hijau (mis. "kode baru sudah dikirim").
class _InfoBanner extends StatelessWidget {
  final String message;
  const _InfoBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        border: Border.all(color: const Color(0xFFA7F3D0)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline,
              color: Color(0xFF047857), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: Color(0xFF047857)),
            ),
          ),
        ],
      ),
    );
  }
}

/// 6 kotak input OTP. Di belakang layar tetap SATU TextField (transparan,
/// menutupi kotak-kotaknya) -- jadi ketik, hapus, dan paste tetap jalan
/// normal. Kotak-kotak ini cuma "tampilan" dari isi controller:
///   - angka di [revealIndex] ditampilkan apa adanya (baru diketik)
///   - angka lain yang sudah terisi ditampilkan sebagai "*"
///   - kotak berikutnya yang akan diisi diberi garis biru
class _OtpBoxes extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final int length;
  final int? revealIndex;
  final bool enabled;
  final ValueChanged<String> onChanged;

  const _OtpBoxes({
    required this.controller,
    required this.focusNode,
    required this.length,
    required this.revealIndex,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    // Rebuild kotak tiap isi atau fokus TextField berubah.
    return ListenableBuilder(
      listenable: Listenable.merge([controller, focusNode]),
      builder: (context, _) {
        final text = controller.text;
        final hasFocus = focusNode.hasFocus;

        return Stack(
          children: [
            Row(
              children: [
                for (var i = 0; i < length; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(
                    child: _OtpBox(
                      char: i < text.length
                          ? (i == revealIndex ? text[i] : '*')
                          : '',
                      active: hasFocus &&
                          (i == text.length ||
                              (text.length == length && i == length - 1)),
                    ),
                  ),
                ],
              ],
            ),
            // TextField asli -- transparan, menutupi seluruh baris kotak
            // supaya tap di kotak mana pun langsung membuka keyboard.
            Positioned.fill(
              child: Opacity(
                opacity: 0,
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  enabled: enabled,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  showCursor: false,
                  enableInteractiveSelection: false,
                  // Hanya angka, maksimal [length] digit.
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(length),
                  ],
                  onChanged: onChanged,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Satu kotak angka.
class _OtpBox extends StatelessWidget {
  final String char;
  final bool active;

  const _OtpBox({required this.char, required this.active});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F8),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: active ? kBrandColor : Colors.transparent,
          width: 1.6,
        ),
      ),
      child: Text(
        char,
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.black87,
        ),
      ),
    );
  }
}