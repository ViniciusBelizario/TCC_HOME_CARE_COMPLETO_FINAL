import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class AppConfig {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3333/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:3333/api';
    return 'http://localhost:3333/api';
  }
}
