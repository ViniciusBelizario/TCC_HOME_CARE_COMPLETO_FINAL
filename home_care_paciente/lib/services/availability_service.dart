import 'dart:convert';
import '../core/api_client.dart';

/// Parseia timestamp do /availability como **LOCAL**, ignorando 'Z'.
/// Ex.: "2025-11-05T13:50:00.000Z" -> DateTime(2025,11,05,13,50,00) LOCAL
DateTime _parseAvailabilityLocal(String iso) {
  // remove o 'Z' (se houver) para evitar conversão para UTC
  final noZ = iso.endsWith('Z') ? iso.substring(0, iso.length - 1) : iso;
  // agora o DateTime será interpretado como horário local do device
  return DateTime.parse(noZ);
}

class Slot {
  final int id;
  final int doctorId;
  final DateTime startsAt; // horário local (sem deslocamento)
  final DateTime endsAt;   // horário local (sem deslocamento)
  final bool? isBooked;

  Slot({
    required this.id,
    required this.doctorId,
    required this.startsAt,
    required this.endsAt,
    this.isBooked,
  });

  factory Slot.fromJson(Map<String, dynamic> j) => Slot(
        id: j['id'],
        doctorId: j['doctorId'],
        startsAt: _parseAvailabilityLocal(j['startsAt']),
        endsAt: _parseAvailabilityLocal(j['endsAt']),
        isBooked: j['isBooked'],
      );
}

class AvailabilityService {
  Future<List<Slot>> list({
    required int doctorId,
    DateTime? from, // passe LOCAL (ex.: DateTime(y,m,d))
    DateTime? to,   // passe LOCAL
  }) async {
    final q = <String, String>{'doctorId': '$doctorId'};

    // IMPORTANTE: envie o filtro como **LOCAL** (SEM toUtc/SEM 'Z'),
    // porque o backend está tratando como hora local.
    if (from != null) q['from'] = from.toIso8601String();
    if (to != null)   q['to']   = to.toIso8601String();

    final resp = await ApiClient.I.get('/availability', query: q);

    if (resp.statusCode == 200) {
      final arr = jsonDecode(resp.body) as List;
      return arr
          .map((e) => Slot.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    throw Exception('Erro ao listar disponibilidade (${resp.statusCode})');
  }
}
