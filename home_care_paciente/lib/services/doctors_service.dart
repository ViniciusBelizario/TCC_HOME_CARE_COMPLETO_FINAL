// lib/services/doctors_service.dart
import 'dart:convert';
import '../core/api_client.dart';

/// Model mínimo só pra tipar a lista na tela
class Doctor {
  final int id;
  final String name;

  Doctor({required this.id, required this.name});

  factory Doctor.fromJson(Map<String, dynamic> j) => Doctor(
        id: j['id'] is int
            ? j['id'] as int
            : int.tryParse(j['id']?.toString() ?? '') ?? 0,
        name: (j['name'] as String?)?.trim().isNotEmpty == true
            ? j['name']
            : 'Médico',
      );
}

class DoctorsService {
  /// Mantém a assinatura antiga da sua tela (retorna List<Doctor>)
  Future<List<Doctor>> list({String q = ''}) async {
    final resp = await ApiClient.I.get(
      '/doctors',
      query: q.isNotEmpty ? {'q': q} : null,
    );

    if (resp.statusCode != 200) {
      throw Exception('Erro ao listar médicos (${resp.statusCode})');
    }

    final decoded = jsonDecode(resp.body);

    // Formato NOVO da API: { items: [ ... ], total, page, ... }
    if (decoded is Map<String, dynamic>) {
      final items = decoded['items'];
      if (items is List) {
        return items
            .map((e) => Doctor.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      return const <Doctor>[]; // fallback seguro
    }

    // Compatível com formato ANTIGO (array na raiz), se ainda aparecer
    if (decoded is List) {
      return decoded
          .map((e) => Doctor.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    throw Exception('Formato de resposta inesperado em /doctors');
  }
}
