import 'package:flutter/material.dart';
import '../core/colors.dart';

class ConsultaCard extends StatelessWidget {
  final String data;
  final String titulo;
  final String subtitulo;
  final String hora;

  const ConsultaCard({
    super.key,
    required this.data,
    required this.titulo,
    required this.subtitulo,
    required this.hora,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Data
          Container(
            width: 46,
            alignment: Alignment.center,
            child: Text(
              data,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.blackText,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Título e subtítulo
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.blackText,
                  ),
                ),
                Text(
                  subtitulo,
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: Color(0xFF697a98),
                  ),
                ),
              ],
            ),
          ),
          // Hora (se não vazio)
          if (hora.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 12.0, top: 3),
              child: Text(
                hora,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.blackText,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
