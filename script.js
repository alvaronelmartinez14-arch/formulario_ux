document.addEventListener("DOMContentLoaded", () => {
    const { createClient } = window.supabase;
    const supabaseClient = createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.publishableKey
    );
    const form = document.getElementById("travelForm");
    const archivoPoster = document.getElementById("archivoPoster");
    const posterPreview = document.getElementById("posterPreview");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authFields = document.getElementById("authFields");
    const authStatus = document.getElementById("authStatus");
    const formStatus = document.getElementById("formStatus");
    const toggleOtro = document.getElementById("toggleOtro");
    const otherServiceEntry = document.getElementById("otherServiceEntry");
    const otherServiceInput = document.getElementById("otherServiceInput");
    const customServices = document.getElementById("customServices");
    const otherServiceStatus = document.getElementById("otherServiceStatus");

    const setAuthState = session => {
        const signedIn = Boolean(session?.user);
        form.hidden = !signedIn;
        authFields.hidden = signedIn;
        document.getElementById("btnSignIn").hidden = signedIn;
        document.getElementById("btnSignUp").hidden = signedIn;
        document.getElementById("btnSignOut").hidden = !signedIn;
        authStatus.classList.remove("error");
        authStatus.textContent = signedIn
            ? `Sesión iniciada: ${session.user.email}`
            : "Inicia sesión con tu cuenta de la aplicación.";
    };

    const setAuthMessage = (message, isError = false) => {
        authStatus.textContent = message;
        authStatus.classList.toggle("error", isError);
    };

    const getAuthCredentials = () => ({
        email: authEmail.value.trim(),
        password: authPassword.value
    });

    document.getElementById("btnSignIn").addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signInWithPassword(getAuthCredentials());
        if (error) setAuthMessage(error.message, true);
    });

    document.getElementById("btnSignUp").addEventListener("click", async () => {
        const { data, error } = await supabaseClient.auth.signUp({
            ...getAuthCredentials(),
            options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
        });
        if (error) {
            setAuthMessage(error.message, true);
        } else if (!data.session) {
            setAuthMessage("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
        }
    });

    document.getElementById("btnSignOut").addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) setAuthMessage(error.message, true);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => setAuthState(session));
    supabaseClient.auth.getSession().then(({ data, error }) => {
        if (error) setAuthMessage(error.message, true);
        setAuthState(data.session);
    });

    toggleOtro.addEventListener("change", () => {
        otherServiceEntry.hidden = !toggleOtro.checked;
        otherServiceStatus.textContent = "";
        if (toggleOtro.checked) otherServiceInput.focus();
    });

    const addOtherService = () => {
        const serviceName = otherServiceInput.value.trim();
        if (!serviceName) {
            otherServiceInput.focus();
            return;
        }

        const existingServices = [...form.querySelectorAll('input[name="servicios"]')]
            .map(input => input.closest("label").querySelector("span").textContent.trim().toLocaleLowerCase());

        if (existingServices.includes(serviceName.toLocaleLowerCase())) {
            otherServiceStatus.textContent = "Ese servicio ya está en la lista.";
            otherServiceInput.focus();
            return;
        }

        const label = document.createElement("label");
        label.className = "service-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "servicios";
        checkbox.value = serviceName;
        checkbox.checked = true;
        const text = document.createElement("span");
        text.textContent = serviceName;
        label.append(checkbox, text);
        customServices.append(label);

        otherServiceInput.value = "";
        otherServiceStatus.textContent = `Servicio agregado: ${serviceName}`;
        otherServiceInput.focus();
    };

    document.getElementById("addOtherService").addEventListener("click", addOtherService);
    otherServiceInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addOtherService();
        }
    });

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

    form.addEventListener("submit", async event => {
        event.preventDefault();
        formStatus.classList.remove("error");
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

            if (!campo.value.trim() || !campo.checkValidity()) {
                grupo.classList.add("invalid");
                isValid = false;
            } else {
                grupo.classList.remove("invalid");
            }
        });

        const fechaSalida = document.getElementById("fechaSalida").value;
        const fechaRegreso = document.getElementById("fechaRegreso").value;
        if (fechaRegreso < fechaSalida) {
            document.getElementById("fechaRegreso").closest(".form-group").classList.add("invalid");
            isValid = false;
        }

        if (!isValid) {
            alert("Por favor, completa los campos obligatorios marcados en rojo.");
            return;
        }

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData.user) {
            formStatus.textContent = "Tu sesión expiró. Inicia sesión nuevamente.";
            formStatus.classList.add("error");
            setAuthState(null);
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        formStatus.textContent = "Guardando paquete...";

        let posterPath = null;
        try {
            const poster = archivoPoster.files[0];
            if (poster) {
                const safeFileName = poster.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                posterPath = `${userData.user.id}/${crypto.randomUUID()}-${safeFileName}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from("package-posters")
                    .upload(posterPath, poster, { upsert: false, contentType: poster.type });

                if (uploadError) throw uploadError;
            }

            const packageData = {
                owner_id: userData.user.id,
                title: document.getElementById("tituloPaquete").value.trim(),
                destination_country: document.getElementById("paisDestino").value.trim(),
                departure_city: document.getElementById("ciudadSalida").value.trim(),
                departure_date: fechaSalida,
                return_date: fechaRegreso,
                travelers: Number(document.getElementById("cantidadViajeros").value),
                price_per_person: Number(document.getElementById("precioPersona").value),
                transport: document.getElementById("transporte").value,
                accommodation: document.getElementById("allojamiento").value,
                services: [...form.querySelectorAll('input[name="servicios"]:checked')].map(input => input.value),
                description: document.getElementById("sinopsis").value.trim(),
                availability: document.getElementById("estadoPublicacion").value,
                poster_path: posterPath
            };

            const { error: insertError } = await supabaseClient
                .from("travel_packages")
                .insert(packageData);

            if (insertError) throw insertError;

            form.reset();
            posterPreview.innerHTML = "<span>Sin imagen</span>";
            customServices.replaceChildren();
            otherServiceEntry.hidden = true;
            otherServiceStatus.textContent = "";
            document.querySelectorAll(".form-group").forEach(group => group.classList.remove("invalid"));
            formStatus.textContent = "Paquete guardado correctamente.";
        } catch (error) {
            if (posterPath) {
                await supabaseClient.storage.from("package-posters").remove([posterPath]);
            }
            formStatus.textContent = `No se pudo guardar el paquete: ${error.message}`;
            formStatus.classList.add("error");
        } finally {
            submitButton.disabled = false;
        }
    });

    // Botón cancelar
    document.getElementById("btnCancelar").addEventListener("click", () => {
        if (confirm("¿Deseas cancelar y limpiar el formulario?")) {
            form.reset();
            posterPreview.innerHTML = "<span>Sin imagen</span>";
            customServices.replaceChildren();
            otherServiceEntry.hidden = true;
            otherServiceStatus.textContent = "";
            document.querySelectorAll(".form-group").forEach(g => g.classList.remove("invalid"));
        }
    });
});