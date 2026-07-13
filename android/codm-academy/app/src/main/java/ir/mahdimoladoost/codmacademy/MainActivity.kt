package ir.mahdimoladoost.codmacademy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import ir.mahdimoladoost.codmacademy.ui.AcademyApp
import ir.mahdimoladoost.codmacademy.ui.AcademyViewModel
import ir.mahdimoladoost.codmacademy.ui.theme.CodmAcademyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CodmAcademyTheme {
                val academyViewModel: AcademyViewModel = viewModel()
                AcademyApp(academyViewModel)
            }
        }
    }
}
