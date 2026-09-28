import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/themes/app_theme.dart';

/// Pengganti showTimePicker bawaan -- versi Flutter dari `TimeStepper` di
/// web (web/app/admin/jam-operasional/page.tsx).
///
/// Jam, menit, & detik bisa diubah lewat tombol panah, ATAU diketuk lalu
/// diketik langsung angkanya. Menit & detik melompat per 5 dan selalu
/// "snap" ke kelipatan 5 terdekat di arah yang ditekan (08 -> 10, 59 ->
/// 00), jam per 1. Tombolnya dibuat besar supaya gampang dipakai petugas
/// yang kurang terbiasa pakai HP.
class TimeStepper extends StatelessWidget {
  /// Format "HH:MM" atau "HH:MM:SS".
  final String value;
  final ValueChanged<String> onChanged;
  final bool enabled;
  final bool showSeconds;

  const TimeStepper({
    super.key,
    required this.value,
    required this.onChanged,
    this.enabled = true,
    this.showSeconds = true,
  });

  List<int> get _parts {
    final p = value.split(':').map((n) => int.tryParse(n) ?? 0).toList();
    while (p.length < 3) {
      p.add(0);
    }
    return p;
  }

  String _build(int h, int m, int s) {
    String two(int n) => n.toString().padLeft(2, '0');
    return showSeconds ? '${two(h)}:${two(m)}:${two(s)}' : '${two(h)}:${two(m)}';
  }

  static int _wrap(int n, int mod) => ((n % mod) + mod) % mod;

  static int _snap5(int current, int direction) {
    final next = direction == 1
        ? ((current + 1) / 5).ceil() * 5
        : ((current - 1) / 5).floor() * 5;
    return _wrap(next, 60);
  }

  @override
  Widget build(BuildContext context) {
    final p = _parts;
    final hh = p[0], mm = p[1], ss = p[2];

    Widget colon() => const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: Text(':', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600)),
        );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _UnitStepper(
          label: 'jam',
          value: hh,
          max: 23,
          enabled: enabled,
          onUp: () => onChanged(_build(_wrap(hh + 1, 24), mm, ss)),
          onDown: () => onChanged(_build(_wrap(hh - 1, 24), mm, ss)),
          onTyped: (v) => onChanged(_build(v, mm, ss)),
        ),
        colon(),
        _UnitStepper(
          label: 'menit',
          value: mm,
          max: 59,
          enabled: enabled,
          onUp: () => onChanged(_build(hh, _snap5(mm, 1), ss)),
          onDown: () => onChanged(_build(hh, _snap5(mm, -1), ss)),
          onTyped: (v) => onChanged(_build(hh, v, ss)),
        ),
        if (showSeconds) ...[
          colon(),
          _UnitStepper(
            label: 'detik',
            value: ss,
            max: 59,
            enabled: enabled,
            onUp: () => onChanged(_build(hh, mm, _snap5(ss, 1))),
            onDown: () => onChanged(_build(hh, mm, _snap5(ss, -1))),
            onTyped: (v) => onChanged(_build(hh, mm, v)),
          ),
        ],
      ],
    );
  }
}

class _UnitStepper extends StatefulWidget {
  final String label;
  final int value;
  final int max;
  final bool enabled;
  final VoidCallback onUp;
  final VoidCallback onDown;
  final ValueChanged<int> onTyped;

  const _UnitStepper({
    required this.label,
    required this.value,
    required this.max,
    required this.enabled,
    required this.onUp,
    required this.onDown,
    required this.onTyped,
  });

  @override
  State<_UnitStepper> createState() => _UnitStepperState();
}

class _UnitStepperState extends State<_UnitStepper> {
  bool _editing = false;
  final _controller = TextEditingController();
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    // Keluar dari mode ketik (tap di luar) = simpan, sama kayak onBlur di web.
    _focus.addListener(() {
      if (!_focus.hasFocus && _editing) _commit();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _startEdit() {
    if (!widget.enabled) return;
    _controller.text = widget.value.toString().padLeft(2, '0');
    _controller.selection = TextSelection(baseOffset: 0, extentOffset: _controller.text.length);
    setState(() => _editing = true);
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
  }

  void _commit() {
    final parsed = int.tryParse(_controller.text);
    if (parsed != null) widget.onTyped(parsed.clamp(0, widget.max).toInt());
    if (mounted) setState(() => _editing = false);
  }

  @override
  Widget build(BuildContext context) {
    final border = BorderRadius.circular(10);
    const boxSize = Size(58, 50);

    Widget arrow(IconData icon, VoidCallback onTap, String tooltip) => SizedBox(
          width: boxSize.width,
          height: 40,
          child: IconButton(
            tooltip: tooltip,
            onPressed: widget.enabled ? onTap : null,
            icon: Icon(icon, size: 26),
            color: kBrandColor,
          ),
        );

    final valueBox = _editing
        ? SizedBox(
            width: boxSize.width,
            height: boxSize.height,
            child: TextField(
              controller: _controller,
              focusNode: _focus,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              textInputAction: TextInputAction.done,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(2),
              ],
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              decoration: InputDecoration(
                contentPadding: EdgeInsets.zero,
                border: OutlineInputBorder(borderRadius: border),
                focusedBorder: OutlineInputBorder(
                  borderRadius: border,
                  borderSide: const BorderSide(color: kBrandColor, width: 2),
                ),
              ),
              onSubmitted: (_) => _commit(),
            ),
          )
        : Semantics(
            button: true,
            label: 'Ketik ${widget.label} langsung',
            child: InkWell(
              borderRadius: border,
              onTap: widget.enabled ? _startEdit : null,
              child: Container(
                width: boxSize.width,
                height: boxSize.height,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F4F9),
                  borderRadius: border,
                  border: Border.all(color: const Color(0xFFD6DCE6)),
                ),
                child: Text(
                  widget.value.toString().padLeft(2, '0'),
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: widget.enabled ? Colors.black87 : Colors.black38,
                  ),
                ),
              ),
            ),
          );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        arrow(Icons.keyboard_arrow_up_rounded, widget.onUp, 'Tambah ${widget.label}'),
        valueBox,
        arrow(Icons.keyboard_arrow_down_rounded, widget.onDown, 'Kurangi ${widget.label}'),
      ],
    );
  }
}