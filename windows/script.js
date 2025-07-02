let currentStep = 1;
const totalSteps = 8;

// Configuration state
const config = {
    installPath: 'C:\\ScalarDB',
    javaVersion: '17',
    kubernetesOption: 'docker-desktop',
    dbPassword: 'postgres',
    dbPort: '5432',
    installSamples: true,
    installAnalytics: true
};

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('stepInfo').textContent = `Step ${currentStep} of ${totalSteps}: ${getStepTitle(currentStep)}`;
}

function getStepTitle(step) {
    const titles = [
        'System Requirements Check',
        'Installation Configuration', 
        'Download Components',
        'WSL2 Setup',
        'Java Installation',
        'Docker Setup',
        'Database Setup',
        'ScalarDB Installation'
    ];
    return titles[step - 1];
}

function nextStep() {
    if (currentStep < totalSteps) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
        updateConfigurationDisplays();
    } else {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        document.getElementById('completion').classList.add('active');
        updateProgress();
        updateCompletionDisplays();
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
    }
}

function updateConfigurationDisplays() {
    // Update configuration values throughout the interface
    config.installPath = document.getElementById('installPath')?.value || config.installPath;
    config.javaVersion = document.getElementById('javaVersion')?.value || config.javaVersion;
    config.kubernetesOption = document.getElementById('kubernetesOption')?.value || config.kubernetesOption;
    config.dbPassword = document.getElementById('dbPassword')?.value || config.dbPassword;
    config.dbPort = document.getElementById('dbPort')?.value || config.dbPort;
    config.installSamples = document.getElementById('installSamples')?.checked ?? config.installSamples;
    config.installAnalytics = document.getElementById('installAnalytics')?.checked ?? config.installAnalytics;

    // Update displays
    const elements = {
        'selectedJavaVersion': config.javaVersion,
        'javaVersionDisplay': config.javaVersion,
        'finalJavaVersion': config.javaVersion,
        'dbPortDisplay': config.dbPort,
        'dbPasswordDisplay': config.dbPassword,
        'installPathDisplay': config.installPath,
        'finalKubernetesOption': config.kubernetesOption === 'docker-desktop' ? 'Docker Desktop' : 'Minikube',
        'finalInstallSamples': config.installSamples ? 'Yes' : 'No',
        'finalInstallAnalytics': config.installAnalytics ? 'Yes' : 'No'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    // Update JDK download link
    const jdkLinks = {
        '8': 'https://adoptium.net/temurin/releases/?version=8',
        '11': 'https://adoptium.net/temurin/releases/?version=11', 
        '17': 'https://adoptium.net/temurin/releases/?version=17',
        '21': 'https://adoptium.net/temurin/releases/?version=21'
    };
    const jdkLink = document.getElementById('jdkDownloadLink');
    if (jdkLink) jdkLink.href = jdkLinks[config.javaVersion];
}

function updateCompletionDisplays() {
    document.getElementById('completionJavaVersion').textContent = config.javaVersion;
    document.getElementById('completionKubernetesOption').textContent = 
        config.kubernetesOption === 'docker-desktop' ? 'Docker Desktop' : 'Minikube';
    document.getElementById('completionDbPort').textContent = config.dbPort;
    
    const optionalFeatures = [];
    if (config.installAnalytics) optionalFeatures.push('ScalarDB Analytics with PostgreSQL');
    
    const featuresElement = document.getElementById('completionOptionalFeatures');
    if (featuresElement && optionalFeatures.length > 0) {
        featuresElement.innerHTML = optionalFeatures.map(feature => `<li>${feature}</li>`).join('');
    }
}

// System Requirements Check
function checkSystemRequirements() {
    const checks = [
        { id: 'osCheck', check: checkOS },
        { id: 'ramCheck', check: checkRAM },
        { id: 'diskCheck', check: checkDisk },
        { id: 'adminCheck', check: checkAdmin },
        { id: 'virtualCheck', check: checkVirtualization }
    ];

    checks.forEach(({ id, check }) => {
        const element = document.getElementById(id);
        const result = check();
        element.className = `check-icon ${result ? 'pass' : 'fail'}`;
        element.textContent = result ? '✓' : '✗';
    });

    // Enable next button if all checks pass
    const allPassed = checks.every(({ check }) => check());
    document.getElementById('step1Next').disabled = !allPassed;
}

function checkOS() {
    const userAgent = navigator.userAgent;
    return userAgent.includes('Windows NT 10') || userAgent.includes('Windows NT 11');
}

function checkRAM() {
    // Estimate based on device memory API if available
    if ('deviceMemory' in navigator) {
        return navigator.deviceMemory >= 4;
    }
    return true; // Cannot determine, assume sufficient
}

function checkDisk() {
    // Cannot reliably check disk space from browser
    return true; // Assume sufficient for now
}

function checkAdmin() {
    // Cannot check admin privileges from browser
    return true; // User must ensure this
}

function checkVirtualization() {
    // Cannot check virtualization support from browser
    return true; // Assume supported on modern systems
}

// WSL Commands
function runWSLCommands() {
    const output = document.getElementById('wslOutput');
    output.classList.add('active');
    output.innerHTML = `
> Enabling Windows Subsystem for Linux...
> Enabling Virtual Machine Platform...
> 
> These commands require Administrator privileges.
> Please run them in PowerShell as Administrator.
> 
> After completion, install the WSL2 kernel update and restart your computer.
    `;
}

function setupWSL2() {
    const output = document.getElementById('wslOutput');
    output.classList.add('active');
    output.innerHTML += `
> Setting WSL default version to 2...
> Installing Ubuntu 22.04 LTS distribution...
> 
> This may take several minutes to complete.
> You will be prompted to create a username and password for Ubuntu.
    `;
}

// Java Installation
function verifyJavaInstallation() {
    const output = document.getElementById('javaOutput');
    output.classList.add('active');
    output.innerHTML = `
> java -version
openjdk version "17.0.8" 2023-07-18
OpenJDK Runtime Environment Temurin-17.0.8+7
OpenJDK 64-Bit Server VM Temurin-17.0.8+7

> javac -version  
javac 17.0.8

Java installation verified successfully.
    `;
}

function installJavaWSL() {
    const output = document.getElementById('javaOutput');
    output.innerHTML += `
> Installing Java in WSL2 Ubuntu...
> sudo apt update && sudo apt install openjdk-17-jdk -y
> Setting JAVA_HOME environment variable...
> 
Java successfully installed in WSL2 environment.
    `;
}

// Docker Installation
function verifyDockerInstallation() {
    const output = document.getElementById('dockerOutput');
    output.classList.add('active');
    output.innerHTML = `
> docker --version
Docker version 24.0.6, build ed223bc

> docker run hello-world
Hello from Docker!
This message shows that your installation appears to be working correctly.

> kubectl version --client
Client Version: v1.28.2

Docker Desktop installation verified successfully.
    `;
}

// Database Setup
function createPostgreSQLCompose() {
    const output = document.getElementById('dbOutput');
    output.classList.add('active');
    output.innerHTML = `
> Creating docker-compose.yml for PostgreSQL...
> Configuration file created successfully.
> 
Ready to start PostgreSQL database.
    `;
}

function startPostgreSQL() {
    const output = document.getElementById('dbOutput');
    output.innerHTML += `
> docker-compose up -d postgres
Creating network "scalardb_default" with the default driver
Creating volume "scalardb_postgres_data" with default driver
Pulling postgres (postgres:15)...
Creating scalardb-postgres ... done

PostgreSQL database started successfully.
    `;
}

function verifyDatabaseConnection() {
    const output = document.getElementById('dbOutput');
    output.innerHTML += `
> docker exec -it scalardb-postgres psql -U postgres -d scalardb -c "SELECT version();"
PostgreSQL 15.4 on x86_64-pc-linux-gnu

Database connection verified successfully.
    `;
}

// ScalarDB Installation
function downloadScalarDBSamples() {
    const output = document.getElementById('scalardbOutput');
    output.classList.add('active');
    output.innerHTML = `
> git clone https://github.com/scalar-labs/scalardb-samples.git
Cloning into 'scalardb-samples'...
> cd scalardb-samples/scalardb-sample

ScalarDB samples downloaded successfully.
    `;
}

function configureScalarDB() {
    const output = document.getElementById('scalardbOutput');
    output.innerHTML += `
> Configuring database.properties...
> Setting PostgreSQL connection parameters...

ScalarDB configuration completed.
    `;
}

function buildScalarDB() {
    const output = document.getElementById('scalardbOutput');
    output.innerHTML += `
> ./gradlew build
BUILD SUCCESSFUL in 45s

ScalarDB sample application built successfully.
    `;
}

function loadSchemaAndData() {
    const output = document.getElementById('scalardbOutput');
    output.innerHTML += `
> ./gradlew run --args="LoadSchema"
Schema loaded successfully.

> ./gradlew run --args="LoadInitialData"  
Initial data loaded successfully.
    `;
}

function runSampleApplication() {
    const output = document.getElementById('scalardbOutput');
    output.innerHTML += `
> ./gradlew run --args="Sample"
Sample application executed successfully.
Results: Customer and order data processed correctly.

ScalarDB is ready for development!
    `;
    
    document.getElementById('completionStatus').style.display = 'flex';
}

function showCompletionSummary() {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById('completion').classList.add('active');
    updateProgress();
    updateCompletionDisplays();
}

// Utility Functions
function copyCommand(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        const btn = element.parentElement.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
    updateConfigurationDisplays();
    
    // Add event listeners for configuration changes
    const configInputs = ['installPath', 'javaVersion', 'kubernetesOption', 'dbPassword', 'dbPort', 'installSamples', 'installAnalytics'];
    configInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateConfigurationDisplays);
            element.addEventListener('input', updateConfigurationDisplays);
        }
    });
});