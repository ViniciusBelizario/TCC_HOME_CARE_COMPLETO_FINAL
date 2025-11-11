// lib/core/time.dart
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

/// Serviço central de tempo, fixo em America/Sao_Paulo.
class Time {
  static tz.Location? _saopaulo;

  /// Chamar no início do app (main.dart)
  static void init() {
    tz.initializeTimeZones();
    _saopaulo = tz.getLocation('America/Sao_Paulo');
  }

  static tz.Location get sp {
    if (_saopaulo == null) {
      init();
    }
    return _saopaulo!;
  }

  /// Converte ISO UTC (ex.: "2025-11-05T13:00:00.000Z") para horário de São Paulo.
  static DateTime fromApiUtcToSaoPaulo(String isoUtc) {
    final dtUtc = DateTime.parse(isoUtc).toUtc();
    return tz.TZDateTime.from(dtUtc, sp);
  }

  /// Para filtrar por dia local (São Paulo) no backend:
  /// Constrói o início do dia local (00:00) em SP e retorna ISO em UTC.
  static String startOfDaySaoPauloToUtcIso(DateTime localDaySP) {
    final tzStart = tz.TZDateTime(sp, localDaySP.year, localDaySP.month, localDaySP.day, 0, 0, 0);
    return tzStart.toUtc().toIso8601String();
  }

  /// Fim do dia local (23:59:59.999) -> UTC ISO
  static String endOfDaySaoPauloToUtcIso(DateTime localDaySP) {
    final tzEnd = tz.TZDateTime(sp, localDaySP.year, localDaySP.month, localDaySP.day, 23, 59, 59, 999);
    return tzEnd.toUtc().toIso8601String();
  }
}
