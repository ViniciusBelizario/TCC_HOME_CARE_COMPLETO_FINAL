import 'package:flutter/material.dart';
import '../core/colors.dart';

class CustomBottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const CustomBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: selectedIndex,
      onTap: onTap,
      backgroundColor: Colors.white,
      selectedItemColor: AppColors.blue,
      unselectedItemColor: const Color(0xFF90A0BF),
      showSelectedLabels: true,
      showUnselectedLabels: true,
      items: [
        BottomNavigationBarItem(
          icon: Icon(
            selectedIndex == 0 ? Icons.person : Icons.person_outline,
          ),
          label: 'Perfil',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            selectedIndex == 1 ? Icons.add_circle : Icons.add_circle_outline,
          ),
          label: 'Novo',
        ),
        BottomNavigationBarItem(
          icon: Icon(
            selectedIndex == 2 ? Icons.event : Icons.event_outlined,
          ),
          label: 'Agenda',
        ),
      ],
    );
  }
}
