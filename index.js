// Variables globales
let objectivesData = [];
let globalChart = null;
let detailsChart = null;
let selectedOwner = null;
let selectedDepartment = null;
let currentDepartment = '';
let departmentColors = {};
let isDepartmentView = true; // Indica si estamos viendo departamentos o personas
let searchTimeout = null;

// Elementos del DOM
const uploadStatus = document.getElementById('uploadStatus');
const globalChartCanvas = document.getElementById('globalChart');
const detailsChartCanvas = document.getElementById('detailsChart');
const detailsChartContainer = document.getElementById('detailsChartContainer');
const noSelection = document.getElementById('noSelection');
const detailsTitle = document.getElementById('detailsTitle');
const objectivesTableContainer = document.getElementById('objectivesTableContainer');
const objectivesTableBody = document.getElementById('objectivesTableBody');
const noObjectives = document.getElementById('noObjectives');
const objectivesTableTitle = document.getElementById('objectivesTableTitle');
const departmentSelect = document.getElementById('departmentSelect');
const complianceValue = document.getElementById('complianceValue');
const departmentName = document.getElementById('departmentName');
const chartTitle = document.getElementById('chartTitle');

// NUEVOS ELEMENTOS DEL BUSCADOR
const ownerSearch = document.getElementById('ownerSearch');
const searchButton = document.getElementById('searchButton');
const clearSearch = document.getElementById('clearSearch');
const searchResults = document.getElementById('searchResults');

// Event listeners
departmentSelect.addEventListener('change', filterByDepartment);

// NUEVOS EVENT LISTENERS PARA EL BUSCADOR (CORREGIDOS)
searchButton.addEventListener('click', performSearch);
clearSearch.addEventListener('click', clearSearchResults);
ownerSearch.addEventListener('input', handleSearchInput);
ownerSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// NUEVA FUNCIÓN: Manejar búsqueda en tiempo real (CORREGIDA)
function handleSearchInput() {
    // Limpiar timeout anterior
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Establecer nuevo timeout para buscar después de que el usuario deje de escribir
    searchTimeout = setTimeout(() => {
        const query = ownerSearch.value.trim();
        if (query.length >= 2) {
            performSearch();
        } else {
            clearSearchResults();
        }
    }, 300); // 300ms de delay
}

// NUEVA FUNCIÓN: Realizar búsqueda
function performSearch() {
    const query = ownerSearch.value.trim().toLowerCase();
    
    if (query.length < 2) {
        showSearchResults([]);
        return;
    }
    
    // Buscar propietarios que coincidan con la consulta
    const uniqueOwners = getUniqueOwners();
    const results = uniqueOwners.filter(owner => 
        owner.name.toLowerCase().includes(query) || 
        owner.department.toLowerCase().includes(query)
    );
    
    showSearchResults(results);
}

// NUEVA FUNCIÓN: Obtener propietarios únicos
function getUniqueOwners() {
    const ownerMap = {};
    objectivesData.forEach(item => {
        const key = `${item.owner}|${item.department}`;
        if (!ownerMap[key]) {
            ownerMap[key] = {
                name: item.owner,
                department: item.department,
                objectiveCount: 0
            };
        }
        ownerMap[key].objectiveCount++;
    });
    
    return Object.values(ownerMap);
}

// NUEVA FUNCIÓN: Mostrar resultados de búsqueda
function showSearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No se encontraron propietarios</div>';
        return;
    }
    
    let html = '';
    results.forEach(owner => {
        html += `
            <div class="search-result-item" data-owner="${owner.name}" data-department="${owner.department}">
                <div class="search-result-name">${owner.name}</div>
                <div class="search-result-department">${owner.department} (${owner.objectiveCount} objetivos)</div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
    
    // Agregar event listeners a los resultados
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            const owner = this.getAttribute('data-owner');
            const department = this.getAttribute('data-department');
            selectOwnerFromSearch(owner, department);
        });
    });
}

// NUEVA FUNCIÓN: Seleccionar propietario desde búsqueda
function selectOwnerFromSearch(owner, department) {
    // Limpiar búsqueda
    ownerSearch.value = '';
    searchResults.innerHTML = '';
    
    // Establecer departamento en el selector
    departmentSelect.value = department;
    currentDepartment = department;
    isDepartmentView = false;
    
    // Actualizar gráfico global
    chartTitle.textContent = `Gráfico de Avance - ${department}`;
    updateGlobalChartOwners();
    
    // Seleccionar propietario
    selectOwner(owner, department);
    
    // Actualizar panel de cumplimiento
    updateCompliancePanel();
}

// NUEVA FUNCIÓN: Limpiar resultados de búsqueda
function clearSearchResults() {
    ownerSearch.value = '';
    searchResults.innerHTML = '';
}

// Función para cargar automáticamente desde ruta específica
async function loadFromPath() {
    showStatus('Cargando datos desde archivo Excel...', 'loading');
    
    try {
        // Ruta al archivo Excel
        const filePath = './avanceObjetivosImperquimia.xlsx'; // Ruta relativa al archivo HTML
        
        // Intentar cargar el archivo
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`No se pudo cargar el archivo: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Asumimos que los datos están en la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Procesar los datos
        processExcelData(jsonData);
        
        showStatus('Datos cargados correctamente desde: ' + filePath, 'success');
    } catch (error) {
        console.error('Error al cargar el archivo:', error);
        showStatus(`Error: ${error.message}. Verifica que el archivo esté en la ruta correcta.`, 'error');
        
        // Si hay error, cargar datos de ejemplo
        loadSampleData();
    }
}

// Función para cargar datos de ejemplo (en caso de error)
function loadSampleData() {
    showStatus('Cargando datos de ejemplo...', 'loading');
    
    // Datos de ejemplo basados en la estructura proporcionada
    const sampleData = [
        { department: "AUDITORIA INTERNA", owner: "JOSE DANIEL ECHEVERRIA", objective: "Cumplir con el 100% del plan anual de capacitación que la organización asigne al área de Auditoria Interna en el ejercicio 2025", progress: 0 },
        { department: "AUDITORIA INTERNA", owner: "JOSE DANIEL ECHEVERRIA", objective: "El área de auditoria debe conocer y comprender el 80% de los procedimientos y políticas Corporativos y de Gestión de Calidad de la organización durante el ejercicio 2025", progress: 0 },
        { department: "AUDITORIA INTERNA", owner: "JOSE DANIEL ECHEVERRIA", objective: "Validar el correcto cumplimiento del 80 % de procesos y políticas del área comercial en el 2025", progress: 0 },
        { department: "AUDITORIA INTERNA", owner: "JOSE DANIEL ECHEVERRIA", objective: "Verificar el correcto funcionamiento de los procesos operativos y administrativos en el 100% de las tiendas durante el ejercicio 2025", progress: 0 },
        { department: "AUDITORIA INTERNA", owner: "JOSE DANIEL ECHEVERRIA", objective: "Verificar y validar el correcto cumplimiento de 60% de los procesos de producción y operativos en planta", progress: 0 },
        { department: "NACIONAL DE VENTAS", owner: "HEBER ABIMAEL MATEOS", objective: "Aumentar las ventas de 2024 vs 2025, para lograr alcanzar el 100% del presupuesto anual", progress: 100 },
        { department: "NACIONAL DE VENTAS", owner: "HEBER ABIMAEL MATEOS", objective: "Cumplir al 100% con sus tareas operativas asignadas en la matriz", progress: 90 },
        { department: "NACIONAL DE VENTAS", owner: "HEBER ABIMAEL MATEOS", objective: "Cumplir al 100% de entrega de mercancía con factura", progress: 100 },
        { department: "NACIONAL DE VENTAS", owner: "HEBER ABIMAEL MATEOS", objective: "Cumplir y alcanzar una calificación mínima de 95% en el check list operativo", progress: 100 },
        { department: "NACIONAL DE VENTAS", owner: "HUMBERTO ANTONIO BAK", objective: "Aumentar las ventas de 2024 vs 2025, para lograr alcanzar el 100% del presupuesto anual", progress: 100 },
        { department: "NACIONAL DE VENTAS", owner: "HUMBERTO ANTONIO BAK", objective: "Cumplimiento al 100% de los inventarios cíclicos asignados, sin diferencias.", progress: 100 },
        { department: "NACIONAL DE VENTAS", owner: "HUMBERTO ANTONIO BAK", objective: "Cumplir con el 95% de cumplimiento del envio diario de las llamadas de salida realizadas por cada tienda (correo de evidencia)", progress: 73.68 },
        { department: "NACIONAL DE VENTAS", owner: "HUMBERTO ANTONIO BAK", objective: "Cumplir y alcanzar una calificación mínima de 95% en el check list operativo", progress: 96.94 },
        { department: "NACIONAL DE VENTAS", owner: "HUMBERTO ANTONIO BAK", objective: "Lograr alcanzar el 30% como mínimo, en la conversión de oportunidades asignadas en los CEDIS", progress: 83.33 },
        { department: "TI", owner: "CESAR JARDINES", objective: "Capacitar en 2 procesos automatizados para el 31 de diciembre 2025", progress: 0 },
        { department: "TI", owner: "CESAR JARDINES", objective: "Implementar 2 mejoras tecnológicas para el 31 de diciembre de 2025", progress: 0 },
        { department: "TI", owner: "CESAR JARDINES", objective: "Implementar 2 procedimientos en relación a uso de las herramientas tecnológicas para el 31 de diciembre de 2025", progress: 0 },
        { department: "TI", owner: "CESAR JARDINES", objective: "Integrar 2 áreas operativas para la automatización de procesos al 31 de diciembre 2025", progress: 0 }
    ];
    
    objectivesData = sampleData;
    updateDashboard();
    showStatus('Datos de ejemplo cargados correctamente', 'success');
}

// Función para procesar los datos del Excel
function processExcelData(data) {
    objectivesData = [];
    
    data.forEach(row => {
        // Normalizar nombres de columnas (por si hay variaciones)
        const department = row['Nombre del departamento'] || row['Departamento'] || row['nombre_departamento'] || '';
        const owner = row['Propietario'] || row['Responsable'] || row['propietario'] || '';
        const objective = row['Nombre del objetivo'] || row['Objetivo'] || row['nombre_objetivo'] || '';
        const progress = parseFloat(row['Promedio de realizacion'] || row['Avance'] || row['promedio_realizacion'] || 0);
        
        if (department && owner && objective) {
            objectivesData.push({
                department,
                owner,
                objective,
                progress: isNaN(progress) ? 0 : progress
            });
        }
    });
    
    // Actualizar la interfaz con los nuevos datos
    updateDashboard();
}

// Función para mostrar mensajes de estado
function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status-message ${type}`;
}

// Función para actualizar el dashboard
function updateDashboard() {
    // Actualizar selector de departamentos
    updateDepartmentSelector();
    
    // Establecer vista inicial de departamentos
    currentDepartment = '';
    departmentSelect.value = '';
    
    // Actualizar gráfico global (vista de departamentos)
    updateGlobalChartDepartments();
    
    // Actualizar panel de cumplimiento
    updateCompliancePanel();
    
    // Limpiar selección
    clearSelection();
}

// Función para actualizar el selector de departamentos
function updateDepartmentSelector() {
    // Obtener departamentos únicos
    const departments = [...new Set(objectivesData.map(item => item.department))];
    
    // Limpiar selector
    departmentSelect.innerHTML = '';
    
    // Agregar opción "Todos"
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Todos los departamentos';
    departmentSelect.appendChild(allOption);
    
    // Agregar departamentos
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentSelect.appendChild(option);
    });
    
    // Generar colores para departamentos
    generateDepartmentColors(departments);
}

// Función para generar colores para departamentos
function generateDepartmentColors(departments) {
    const colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 205, 86, 0.7)',
        'rgba(201, 203, 207, 0.7)',
        'rgba(0, 128, 128, 0.7)',
        'rgba(128, 0, 128, 0.7)',
        'rgba(128, 128, 0, 0.7)'
    ];
    
    departments.forEach((dept, index) => {
        departmentColors[dept] = colors[index % colors.length];
    });
}

// Función para filtrar por departamento
function filterByDepartment() {
    currentDepartment = departmentSelect.value;
    
    if (currentDepartment === '') {
        // Vista de todos los departamentos
        isDepartmentView = true;
        chartTitle.textContent = 'Gráfico de Avance por Departamento';
        updateGlobalChartDepartments();
    } else {
        // Vista de personas en un departamento específico
        isDepartmentView = false;
        chartTitle.textContent = `Gráfico de Avance - ${currentDepartment}`;
        updateGlobalChartOwners();
    }
    
    updateCompliancePanel();
}

// Función para actualizar el panel de cumplimiento
function updateCompliancePanel() {
    // Filtrar objetivos por departamento
    let filteredObjectives = objectivesData;
    if (currentDepartment) {
        filteredObjectives = objectivesData.filter(item => item.department === currentDepartment);
        departmentName.textContent = currentDepartment;
    } else {
        departmentName.textContent = 'Todos los Departamentos';
    }
    
    // Calcular estadísticas
    const total = filteredObjectives.length;
    const totalProgress = filteredObjectives.reduce((sum, obj) => sum + obj.progress, 0);
    const avgCompliance = total > 0 ? Math.round((totalProgress / total) * 100) / 100 : 0;
    
    // Actualizar UI
    complianceValue.textContent = `${avgCompliance}%`;
    
    // Cambiar color del panel según el cumplimiento
    const complianceCard = document.querySelector('.compliance-card');
    if (avgCompliance >= 80) {
        complianceCard.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
    } else if (avgCompliance >= 50) {
        complianceCard.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
    } else {
        complianceCard.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    }
}

// Función para calcular estadísticas por departamento
function calculateDepartmentStats() {
    const departmentMap = {};
    
    objectivesData.forEach(item => {
        const dept = item.department;
        
        if (!departmentMap[dept]) {
            departmentMap[dept] = {
                department: dept,
                objectives: [],
                totalProgress: 0
            };
        }
        
        departmentMap[dept].objectives.push({
            objective: item.objective,
            progress: item.progress
        });
        
        departmentMap[dept].totalProgress += item.progress;
    });
    
    // Calcular promedios
    const departmentStats = Object.values(departmentMap).map(deptData => {
        const avgProgress = deptData.totalProgress / deptData.objectives.length;
        return {
            ...deptData,
            avgProgress: Math.round(avgProgress * 100) / 100,
            objectiveCount: deptData.objectives.length
        };
    });
    
    return departmentStats.sort((a, b) => b.avgProgress - a.avgProgress);
}

// Función para calcular estadísticas por propietario
function calculateOwnerStats() {
    const ownerMap = {};
    
    objectivesData.forEach(item => {
        // Filtrar por departamento si está seleccionado
        if (currentDepartment && item.department !== currentDepartment) {
            return;
        }
        
        const key = `${item.owner}|${item.department}`;
        
        if (!ownerMap[key]) {
            ownerMap[key] = {
                owner: item.owner,
                department: item.department,
                objectives: [],
                totalProgress: 0
            };
        }
        
        ownerMap[key].objectives.push({
            objective: item.objective,
            progress: item.progress
        });
        
        ownerMap[key].totalProgress += item.progress;
    });
    
    // Calcular promedios
    const ownerStats = Object.values(ownerMap).map(ownerData => {
        const avgProgress = ownerData.totalProgress / ownerData.objectives.length;
        return {
            ...ownerData,
            avgProgress: Math.round(avgProgress * 100) / 100,
            objectiveCount: ownerData.objectives.length
        };
    });
    
    return ownerStats.sort((a, b) => b.avgProgress - a.avgProgress);
}

// Función para actualizar el gráfico global con departamentos
function updateGlobalChartDepartments() {
    const ctx = globalChartCanvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (globalChart) {
        globalChart.destroy();
    }
    
    const departmentStats = calculateDepartmentStats();
    
    if (departmentStats.length === 0) {
        // Mostrar mensaje si no hay datos
        ctx.font = '16px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles para mostrar', globalChartCanvas.width / 2, globalChartCanvas.height / 2);
        return;
    }
    
    // Preparar datos para el gráfico
    const labels = departmentStats.map(dept => dept.department);
    const data = departmentStats.map(dept => dept.avgProgress);
    
    // Crear colores basados en el departamento
    const backgroundColors = labels.map(dept => departmentColors[dept] || 'rgba(201, 203, 207, 0.7)');
    
    globalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avance Promedio (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje de Avance'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Departamentos'
                    },
                    ticks: {
                        callback: function(value) {
                            // Acortar nombres largos para mejor visualización
                            const label = this.getLabelForValue(value);
                            return label.length > 15 ? label.substring(0, 15) + '...' : label;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const department = departmentStats[index].department;
                    selectDepartment(department);
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Avance: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Función para actualizar el gráfico global con propietarios
function updateGlobalChartOwners() {
    const ctx = globalChartCanvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (globalChart) {
        globalChart.destroy();
    }
    
    const ownerStats = calculateOwnerStats();
    
    if (ownerStats.length === 0) {
        // Mostrar mensaje si no hay datos
        ctx.font = '16px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles para mostrar', globalChartCanvas.width / 2, globalChartCanvas.height / 2);
        return;
    }
    
    // Preparar datos para el gráfico
    const labels = ownerStats.map(owner => owner.owner);
    const data = ownerStats.map(owner => owner.avgProgress);
    const departments = ownerStats.map(owner => owner.department);
    
    // Crear colores basados en el departamento
    const backgroundColors = departments.map(dept => departmentColors[dept] || 'rgba(201, 203, 207, 0.7)');
    
    globalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avance Promedio (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje de Avance'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Propietarios'
                    },
                    ticks: {
                        callback: function(value) {
                            // Acortar nombres largos para mejor visualización
                            const label = this.getLabelForValue(value);
                            return label.length > 15 ? label.substring(0, 15) + '...' : label;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const owner = ownerStats[index].owner;
                    const department = ownerStats[index].department;
                    selectOwner(owner, department);
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const ownerIndex = context.dataIndex;
                            const department = departments[ownerIndex];
                            return `Departamento: ${department}, Avance: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Función para seleccionar un departamento
function selectDepartment(department) {
    selectedDepartment = department;
    selectedOwner = null;
    
    // Mostrar detalles del departamento seleccionado
    showDepartmentDetails(department);
}

// Función para seleccionar un propietario
function selectOwner(owner, department) {
    selectedOwner = { owner, department };
    selectedDepartment = null;
    
    // Mostrar detalles del propietario seleccionado
    showOwnerDetails(owner, department);
}

// Función para mostrar detalles del departamento seleccionado
function showDepartmentDetails(department) {
    // Obtener objetivos del departamento
    const departmentObjectives = objectivesData.filter(
        item => item.department === department
    );
    
    // Actualizar título
    detailsTitle.textContent = `Objetivos del Departamento ${department}`;
    objectivesTableTitle.textContent = `Lista de Objetivos - ${department}`;
    
    // Ocultar mensaje de no selección y mostrar gráfico
    noSelection.style.display = 'none';
    detailsChartContainer.style.display = 'block';
    
    // Mostrar tabla de objetivos
    noObjectives.style.display = 'none';
    objectivesTableContainer.style.display = 'block';
    
    // Actualizar tabla de objetivos
    updateObjectivesTable(departmentObjectives);
    
    // Crear o actualizar gráfico de detalles
    const ctx = detailsChartCanvas.getContext('2d');
    
    if (detailsChart) {
        detailsChart.destroy();
    }
    
    // Preparar datos para el gráfico (agrupados por propietario)
    const ownerStats = calculateOwnerStatsForDepartment(department);
    
    const labels = ownerStats.map(owner => owner.owner);
    const data = ownerStats.map(owner => owner.avgProgress);
    
    // Generar colores basados en el progreso
    const backgroundColors = data.map(progress => {
        if (progress >= 80) return 'rgba(75, 192, 192, 0.7)'; // Verde
        if (progress >= 50) return 'rgba(255, 205, 86, 0.7)'; // Amarillo
        return 'rgba(255, 99, 132, 0.7)'; // Rojo
    });
    
    detailsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avance Promedio (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje de Avance'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Propietarios'
                    }
                }
            }
        }
    });
}

// Función para calcular estadísticas por propietario para un departamento específico
function calculateOwnerStatsForDepartment(department) {
    const ownerMap = {};
    
    objectivesData.forEach(item => {
        if (item.department !== department) {
            return;
        }
        
        const key = `${item.owner}|${item.department}`;
        
        if (!ownerMap[key]) {
            ownerMap[key] = {
                owner: item.owner,
                department: item.department,
                objectives: [],
                totalProgress: 0
            };
        }
        
        ownerMap[key].objectives.push({
            objective: item.objective,
            progress: item.progress
        });
        
        ownerMap[key].totalProgress += item.progress;
    });
    
    // Calcular promedios
    const ownerStats = Object.values(ownerMap).map(ownerData => {
        const avgProgress = ownerData.totalProgress / ownerData.objectives.length;
        return {
            ...ownerData,
            avgProgress: Math.round(avgProgress * 100) / 100,
            objectiveCount: ownerData.objectives.length
        };
    });
    
    return ownerStats.sort((a, b) => b.avgProgress - a.avgProgress);
}

// Función para mostrar detalles del propietario seleccionado
function showOwnerDetails(owner, department) {
    // Obtener objetivos del propietario
    const ownerObjectives = objectivesData.filter(
        item => item.owner === owner && item.department === department
    );
    
    // Actualizar título
    detailsTitle.textContent = `Objetivos de ${owner} (${department})`;
    objectivesTableTitle.textContent = `Lista de Objetivos - ${owner}`;
    
    // Ocultar mensaje de no selección y mostrar gráfico
    noSelection.style.display = 'none';
    detailsChartContainer.style.display = 'block';
    
    // Mostrar tabla de objetivos
    noObjectives.style.display = 'none';
    objectivesTableContainer.style.display = 'block';
    
    // Actualizar tabla de objetivos
    updateObjectivesTable(ownerObjectives);
    
    // Crear o actualizar gráfico de detalles
    const ctx = detailsChartCanvas.getContext('2d');
    
    if (detailsChart) {
        detailsChart.destroy();
    }
    
    // Preparar datos para el gráfico
    const labels = ownerObjectives.map(obj => {
        // Acortar nombres largos de objetivos para mejor visualización
        return obj.objective.length > 50 ? 
            obj.objective.substring(0, 50) + '...' : obj.objective;
    });
    
    const data = ownerObjectives.map(obj => obj.progress);
    
    // Generar colores basados en el progreso
    const backgroundColors = data.map(progress => {
        if (progress >= 80) return 'rgba(75, 192, 192, 0.7)'; // Verde
        if (progress >= 50) return 'rgba(255, 205, 86, 0.7)'; // Amarillo
        return 'rgba(255, 99, 132, 0.7)'; // Rojo
    });
    
    detailsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avance (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje de Avance'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            // Mostrar el objetivo completo en el tooltip
                            const index = tooltipItems[0].dataIndex;
                            return ownerObjectives[index].objective;
                        }
                    }
                }
            }
        }
    });
}

// Función para actualizar la tabla de objetivos
function updateObjectivesTable(objectives) {
    objectivesTableBody.innerHTML = '';
    
    objectives.forEach(obj => {
        const row = document.createElement('tr');
        
        // Determinar el color de la barra de progreso
        const progressColor = obj.progress < 60 ? '#e74c3c' : '#4caf50';
        
        row.innerHTML = `
            <td>${obj.objective}</td>
            <td>${obj.progress}%</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${obj.progress}%; background-color: ${progressColor}"></div>
                </div>
            </td>
        `;
        
        objectivesTableBody.appendChild(row);
    });
}

// Función para limpiar la selección
function clearSelection() {
    selectedOwner = null;
    selectedDepartment = null;
    
    // Ocultar gráfico de detalles y mostrar mensaje
    detailsChartContainer.style.display = 'none';
    noSelection.style.display = 'block';
    detailsTitle.textContent = 'Detalle de Objetivos';
    
    // Ocultar tabla de objetivos
    objectivesTableContainer.style.display = 'none';
    noObjectives.style.display = 'block';
    objectivesTableTitle.textContent = 'Lista de Objetivos';
    
    // Destruir gráfico de detalles si existe
    if (detailsChart) {
        detailsChart.destroy();
        detailsChart = null;
    }
}

// Cargar datos automáticamente al iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadFromPath();
});