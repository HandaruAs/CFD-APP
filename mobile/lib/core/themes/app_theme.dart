import 'package:flutter/material.dart';

/// Warna brand yang sebelumnya di-hardcode ulang di tiap screen
/// (Color(0xFF1C3F7C)) -- sekarang satu sumber kebenaran di sini.
const kBrandColor = Color(0xFF1C3F7C);
const kBrandColorLight = Color(0xFF3A5FA0);

/// Theme terpusat, dipakai sekali di main.dart. Sebelumnya app cuma
/// pakai `ThemeData(primarySwatch: Colors.blue)` bawaan Flutter --
/// makanya kesannya "kuno": warna default Material, tanpa NavigationBar
/// theme, tanpa card/button style konsisten.
class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: kBrandColor,
      brightness: Brightness.light,
      primary: kBrandColor,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: const Color(0xFFF5F7FB),
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: kBrandColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: Colors.white),
      ),

      // NavigationBar (bottom nav modern, dipakai role dgn sedikit tab)
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: kBrandColor.withValues(alpha: 0.12),
        surfaceTintColor: Colors.transparent,
        elevation: 3,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11.5,
            height: 1.15,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? kBrandColor : Colors.black54,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? kBrandColor : Colors.black45,
            size: 24,
          );
        }),
      ),

      // NavigationDrawer (sidebar, dipakai role dgn tab banyak)
      navigationDrawerTheme: NavigationDrawerThemeData(
        backgroundColor: Colors.white,
        indicatorColor: kBrandColor.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? kBrandColor : Colors.black87,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? kBrandColor : Colors.black54,
          );
        }),
      ),

      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
        ),
        margin: EdgeInsets.zero,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: kBrandColor,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: kBrandColor,
          side: const BorderSide(color: kBrandColor),
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: kBrandColor, width: 1.5),
        ),
      ),

      chipTheme: base.chipTheme.copyWith(
        backgroundColor: kBrandColor.withValues(alpha: 0.08),
        labelStyle: const TextStyle(color: kBrandColor, fontWeight: FontWeight.w600),
        side: BorderSide.none,
      ),
    );
  }
}