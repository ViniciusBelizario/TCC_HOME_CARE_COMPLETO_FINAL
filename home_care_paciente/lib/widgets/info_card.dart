import 'package:flutter/material.dart';
import '../core/colors.dart';

class InfoCard extends StatelessWidget {
  final String titulo;
  final String subtitulo;
  final bool selected;

  const InfoCard({
    super.key,
    required this.titulo,
    required this.subtitulo,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 152,
      padding: const EdgeInsets.all(14),
      margin: const EdgeInsets.only(bottom: 10, right: 8),
      decoration: BoxDecoration(
        color: selected ? AppColors.lightBlue : AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? AppColors.blue : Color(0xFFE0E6F0),
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.blackText,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitulo,
            style: TextStyle(
              fontSize: 13,
              color: selected ? AppColors.blue : Color(0xFF90A0BF),
            ),
          ),
        ],
      ),
    );
  }
}
