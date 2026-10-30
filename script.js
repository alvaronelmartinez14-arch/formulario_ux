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
    const authPanel = document.querySelector(".auth-panel");
    const authFields = document.getElementById("authFields");
    const authStatus = document.getElementById("authStatus");
    const formStatus = document.getElementById("formStatus");
    const packagesPanel = document.getElementById("packagesPanel");
    const packagesList = document.getElementById("packagesList");
    const packagesSummary = document.getElementById("packagesSummary");
    const packagesStatus = document.getElementById("packagesStatus");
    const packagesEmpty = document.getElementById("packagesEmpty");
    const toggleOtro = document.getElementById("toggleOtro");
    const otherServiceEntry = document.getElementById("otherServiceEntry");
    const otherServiceInput = document.getElementById("otherServiceInput");
    const customServices = document.getElementById("customServices");
    const otherServiceStatus = document.getElementById("otherServiceStatus");
    const fixedServiceNames = new Map([
        ["desayuno", "Desayuno diario"],
        ["tours", "Tours guiados"],
        ["traslados", "Traslados aeropuerto-hotel"],
        ["seguro", "Seguro de viaje"]
    ]);
    const availabilityNames = new Map([
        ["borrador", "Borrador"],
        ["disponible", "Disponible para reserva"],
        ["agotado", "Agotado"]
    ]);
    let editingPackage = null;
    let activeUserId = null;
    let loadPackages = async () => {};
    let resetForm = () => {};

    const setAuthState = session => {
        const signedIn = Boolean(session?.user);
        const userId = session?.user?.id ?? null;
        const userChanged = activeUserId !== userId;
        activeUserId = userId;
        form.hidden = !signedIn;
        packagesPanel.hidden = !signedIn;
        authPanel.classList.toggle("is-authenticated", signedIn);
        authFields.hidden = signedIn;
        document.getElementById("btnSignIn").hidden = signedIn;
        document.getElementById("btnSignUp").hidden = signedIn;
        document.getElementById("btnSignOut").hidden = !signedIn;
        authStatus.classList.remove("error");
        authStatus.textContent = signedIn
            ? "Sesión activa. Administra tus paquetes."
            : "Inicia sesión con tu cuenta de la aplicación.";

        if (signedIn) {
            authEmail.value = "";
            authPassword.value = "";
            if (userChanged) void loadPackages();
        } else {
            packagesList.replaceChildren();
            packagesSummary.textContent = "Tus paquetes guardados aparecerán aquí.";
            packagesStatus.textContent = "";
            packagesEmpty.hidden = true;
            if (userChanged) resetForm();
        }
    };

    const setAuthMessage = (message, isError = false) => {
        authStatus.textContent = message;
        authStatus.classList.toggle("error", isError);
    };

    const getAuthCredentials = () => ({
        email: authEmail.value.trim(),
        password: authPassword.value
    });

    const formatDate = value => new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium"
    }).format(new Date(`${value}T12:00:00`));

    const createPackageItem = travelPackage => {
        const item = document.createElement("article");
        item.className = "package-item";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = travelPackage.title;
        details.append(title);

        const metadata = document.createElement("p");
        metadata.className = "package-meta";
        const services = Array.isArray(travelPackage.services) ? travelPackage.services : [];
        const serviceNames = services.map(service => fixedServiceNames.get(service) ?? service);
        const price = new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(Number(travelPackage.price_per_person));
        metadata.textContent = [
            `${travelPackage.departure_city} a ${travelPackage.destination_country}`,
            `${formatDate(travelPackage.departure_date)} - ${formatDate(travelPackage.return_date)}`,
            `${travelPackage.travelers} viajeros | ${price} por persona`,
            availabilityNames.get(travelPackage.availability) ?? travelPackage.availability,
            `Servicios: ${serviceNames.length ? serviceNames.join(", ") : "Ninguno"}`
        ].join("\n");
        details.append(metadata);

        const actions = document.createElement("div");
        actions.className = "package-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-secondary";
        editButton.textContent = "Editar";
        editButton.addEventListener("click", () => void startEditing(travelPackage));
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-danger";
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", () => void deletePackage(travelPackage));
        actions.append(editButton, deleteButton);

        item.append(details, actions);
        return item;
    };

    loadPackages = async () => {
        packagesStatus.classList.remove("error");
        packagesStatus.textContent = "Cargando paquetes...";
        packagesEmpty.hidden = true;

        const { data, error } = await supabaseClient
            .from("travel_packages")
            .select("id, title, destination_country, departure_city, departure_date, return_date, travelers, price_per_person, transport, accommodation, services, description, availability, poster_path")
            .order("created_at", { ascending: false });

        if (error) {
            packagesList.replaceChildren();
            packagesSummary.textContent = "";
            packagesStatus.textContent = `No se pudieron cargar los paquetes: ${error.message}`;
            packagesStatus.classList.add("error");
            return;
        }

        const packages = data ?? [];
        packagesList.replaceChildren(...packages.map(createPackageItem));
        packagesSummary.textContent = `${packages.length} ${packages.length === 1 ? "paquete guardado" : "paquetes guardados"}`;
        packagesStatus.textContent = "";
        packagesEmpty.hidden = packages.length > 0;
    };

    resetForm = () => {
        form.reset();
        editingPackage = null;
        posterPreview.innerHTML = "<span>Sin imagen</span>";
        customServices.replaceChildren();
        toggleOtro.checked = false;
        otherServiceEntry.hidden = true;
        otherServiceStatus.textContent = "";
        formStatus.textContent = "";
        formStatus.classList.remove("error");
        document.querySelectorAll(".form-group").forEach(group => group.classList.remove("invalid"));
        form.querySelector('button[type="submit"]').textContent = "Guardar paquete";
        document.getElementById("btnCancelar").textContent = "Cancelar";
    };

    const startEditing = async travelPackage => {
        editingPackage = travelPackage;
        document.getElementById("tituloPaquete").value = travelPackage.title;
        document.getElementById("paisDestino").value = travelPackage.destination_country;
        document.getElementById("ciudadSalida").value = travelPackage.departure_city;
        document.getElementById("fechaSalida").value = travelPackage.departure_date;
        document.getElementById("fechaRegreso").value = travelPackage.return_date;
        document.getElementById("cantidadViajeros").value = travelPackage.travelers;
        document.getElementById("precioPersona").value = travelPackage.price_per_person;
        document.getElementById("transporte").value = travelPackage.transport;
        document.getElementById("allojamiento").value = travelPackage.accommodation;
        document.getElementById("sinopsis").value = travelPackage.description;
        document.getElementById("estadoPublicacion").value = travelPackage.availability;
        archivoPoster.value = "";

        const services = new Set(Array.isArray(travelPackage.services) ? travelPackage.services : []);
        form.querySelectorAll('input[name="servicios"]').forEach(input => {
            input.checked = fixedServiceNames.has(input.value) && services.has(input.value);
        });
        customServices.replaceChildren();
        const customServicesToRestore = [...services].filter(service => !fixedServiceNames.has(service));
        customServicesToRestore.forEach(serviceName => {
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
        });
        toggleOtro.checked = customServicesToRestore.length > 0;
        otherServiceEntry.hidden = !toggleOtro.checked;
        otherServiceStatus.textContent = "";

        posterPreview.innerHTML = "<span>Sin imagen</span>";
        if (travelPackage.poster_path) {
            const { data } = await supabaseClient.storage
                .from("package-posters")
                .createSignedUrl(travelPackage.poster_path, 3600);
            if (data?.signedUrl && editingPackage?.id === travelPackage.id) {
                const image = document.createElement("img");
                image.src = data.signedUrl;
                image.alt = "Vista previa del póster";
                posterPreview.replaceChildren(image);
            }
        }

        form.querySelector('button[type="submit"]').textContent = "Actualizar paquete";
        document.getElementById("btnCancelar").textContent = "Descartar cambios";
        formStatus.textContent = `Editando: ${travelPackage.title}`;
        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const deletePackage = async travelPackage => {
        if (!confirm(`¿Eliminar el paquete "${travelPackage.title}"?`)) return;

        packagesStatus.classList.remove("error");
        packagesStatus.textContent = "Eliminando paquete...";
        const { error } = await supabaseClient
            .from("travel_packages")
            .delete()
            .eq("id", travelPackage.id);

        if (error) {
            packagesStatus.textContent = `No se pudo eliminar el paquete: ${error.message}`;
            packagesStatus.classList.add("error");
            return;
        }

        if (editingPackage?.id === travelPackage.id) resetForm();
        let storageError = null;
        if (travelPackage.poster_path) {
            const result = await supabaseClient.storage
                .from("package-posters")
                .remove([travelPackage.poster_path]);
            storageError = result.error;
        }

        await loadPackages();
        if (storageError) {
            packagesStatus.textContent = "Paquete eliminado; no se pudo borrar su imagen del almacenamiento.";
            packagesStatus.classList.add("error");
        } else {
            packagesStatus.textContent = "Paquete eliminado.";
        }
    };

    document.getElementById("btnRefreshPackages").addEventListener("click", () => void loadPackages());

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

        const wasEditing = Boolean(editingPackage);
        let posterPath = editingPackage?.poster_path ?? null;
        let newPosterPath = null;
        try {
            const poster = archivoPoster.files[0];
            if (poster) {
                if (!posterPath) {
                    const safeFileName = poster.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                    posterPath = `${userData.user.id}/${crypto.randomUUID()}-${safeFileName}`;
                    newPosterPath = posterPath;
                }
                const { error: uploadError } = await supabaseClient.storage
                    .from("package-posters")
                    .upload(posterPath, poster, { upsert: Boolean(editingPackage), contentType: poster.type });

                if (uploadError) throw uploadError;
            }

            const packageData = {
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

            const writeResult = editingPackage
                ? await supabaseClient.from("travel_packages").update(packageData).eq("id", editingPackage.id)
                : await supabaseClient.from("travel_packages").insert({ ...packageData, owner_id: userData.user.id });

            if (writeResult.error) throw writeResult.error;

            newPosterPath = null;
            resetForm();
            formStatus.textContent = wasEditing ? "Paquete actualizado correctamente." : "Paquete guardado correctamente.";
            await loadPackages();
        } catch (error) {
            if (newPosterPath) {
                await supabaseClient.storage.from("package-posters").remove([newPosterPath]);
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
            resetForm();
        }
    });
});