document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("travelForm");
    const archivoPoster = document.getElementById("archivoPoster");
    const posterPreview = document.getElementById("posterPreview");

    // Vista previa de la imagen cargada y conversión a Base64 simulada
    archivoPoster.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("El archivo supera el límite de 2 MB.");
                archivoPoster.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                posterPreview.innerHTML = `<img src="${e.target.result}" alt="Vista previa del póster">`;
            }
            reader.readAsDataURL(file); // Genera la cadena Base64
        } else {
            posterPreview.innerHTML = "<span>Sin imagen</span>";
        }
    });

    // Validación interactiva al enviar el formulario
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let isValid = true;

        // Validar campos obligatorios específicos
        const camposRequeridos = [
            "tituloPaquete", 
            "paisDestino", 
            "ciudadSalida", 
            "fechaSalida", 
            "fechaRegreso", 
            "cantidadViajeros", 
            "precioPersona", 
            "transporte", 
            "allojamiento", 
            "sinopsis"
        ];

        camposRequeridos.forEach(id => {
            const campo = document.getElementById(id);
            const grupo = campo.closest(".form-group");

            if (!campo.value.trim()) {
                grupo.classList.add("invalid");
                isValid = false;
            } else {
                grupo.classList.remove("invalid");
            }
        });

        if (isValid) {
            alert("¡Formulario validado con éxito! (Demostración UX: Para guardar los paquetes realmente necesitarías conectarlo a una base de datos).");
            // Aquí puedes agregar la lógica para enviar los datos mediante fetch() si dispones de una API
        } else {
            alert("Por favor, completa los campos obligatorios marcados en rojo.");
        }
    });

    // Botón cancelar
    document.getElementById("btnCancelar").addEventListener("click", () => {
        if (confirm("¿Deseas cancelar y limpiar el formulario?")) {
            form.reset();
            posterPreview.innerHTML = "<span>Sin imagen</span>";
            document.querySelectorAll(".form-group").forEach(g => g.classList.remove("invalid"));
        }
    });
});