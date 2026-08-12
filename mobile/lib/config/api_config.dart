import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

class ApiConfig {
  static String get baseUrl {
    // Bisa di-override tanpa ubah kode, misal buat tes di HP fisik:
    // flutter run --dart-define=API_BASE_URL=http://192.168.1.5:8080
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) {
      return override;
    }

    if (kIsWeb) {
      // Flutter web selalu jalan di browser di mesin yang sama dengan
      // backend pas development -- localhost selalu benar, gak perlu
      // IP WiFi yang berubah tiap ganti jaringan.
      return 'http://localhost:8080';
    }

    if (Platform.isAndroid) {
      // 10.0.2.2 = alias emulator Android ke localhost mesin host.
      // Kalau tes di HP FISIK (bukan emulator), pakai --dart-define
      // di atas dengan IP LAN laptop kamu.
      return 'http://10.0.2.2:8080';
    }

    return 'http://localhost:8080';
  }
}