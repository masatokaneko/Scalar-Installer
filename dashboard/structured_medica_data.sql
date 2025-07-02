-- ScalarDB Medical Demo - Structured Data
-- This creates the structured medical database with patients, doctors, and appointments

-- Create medical namespace tables
CREATE TABLE IF NOT EXISTS medical_doctors (
    doctor_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    hospital_affiliation VARCHAR(200),
    years_experience INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address VARCHAR(300) NOT NULL,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    insurance_provider VARCHAR(100),
    insurance_id VARCHAR(50),
    blood_type VARCHAR(5),
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_appointments (
    appointment_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    reason_for_visit TEXT,
    diagnosis_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES medical_patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES medical_doctors(doctor_id)
);

-- Insert sample doctors
INSERT INTO medical_doctors (doctor_id, first_name, last_name, specialty, license_number, phone, email, hospital_affiliation, years_experience) VALUES
('DOC001', 'Sarah', 'Johnson', 'Cardiology', 'MD-12345-CA', '555-0101', 'sarah.johnson@stmaryhospital.com', 'St. Mary Medical Center', 15),
('DOC002', 'Michael', 'Chen', 'Orthopedics', 'MD-23456-CA', '555-0102', 'michael.chen@cityorthopedics.com', 'City Orthopedic Clinic', 8),
('DOC003', 'Emily', 'Rodriguez', 'Dermatology', 'MD-34567-CA', '555-0103', 'emily.rodriguez@skincareplus.com', 'SkinCare Plus Dermatology', 12),
('DOC004', 'David', 'Thompson', 'Internal Medicine', 'MD-45678-CA', '555-0104', 'david.thompson@familycare.com', 'Family Care Medical Group', 20),
('DOC005', 'Lisa', 'Patel', 'Psychiatry', 'MD-56789-CA', '555-0105', 'lisa.patel@mindwellness.com', 'Mind Wellness Center', 10);

-- Insert sample patients
INSERT INTO medical_patients (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_id, blood_type, allergies) VALUES
('PAT001', 'James', 'Williams', '1985-03-15', 'Male', '555-1001', 'james.williams@email.com', '123 Oak Street, Los Angeles, CA 90210', 'Maria Williams', '555-1002', 'Blue Cross', 'BC-789456', 'O+', 'Penicillin'),
('PAT002', 'Maria', 'Garcia', '1992-07-22', 'Female', '555-1003', 'maria.garcia@email.com', '456 Pine Avenue, San Francisco, CA 94102', 'Carlos Garcia', '555-1004', 'Kaiser Permanente', 'KP-654321', 'A-', 'None'),
('PAT003', 'Robert', 'Brown', '1978-11-08', 'Male', '555-1005', 'robert.brown@email.com', '789 Elm Drive, San Diego, CA 92101', 'Susan Brown', '555-1006', 'Aetna', 'AET-987654', 'B+', 'Shellfish'),
('PAT004', 'Jennifer', 'Davis', '1995-01-30', 'Female', '555-1007', 'jennifer.davis@email.com', '321 Maple Lane, Sacramento, CA 95814', 'Michael Davis', '555-1008', 'Cigna', 'CIG-123789', 'AB+', 'Pollen, Dust'),
('PAT005', 'William', 'Miller', '1988-09-12', 'Male', '555-1009', 'william.miller@email.com', '654 Cedar Court, Fresno, CA 93701', 'Lisa Miller', '555-1010', 'Blue Cross', 'BC-456123', 'O-', 'None'),
('PAT006', 'Ashley', 'Wilson', '1991-04-25', 'Female', '555-1011', 'ashley.wilson@email.com', '987 Birch Street, Oakland, CA 94601', 'David Wilson', '555-1012', 'Kaiser Permanente', 'KP-789456', 'A+', 'Latex'),
('PAT007', 'Christopher', 'Moore', '1983-12-03', 'Male', '555-1013', 'christopher.moore@email.com', '147 Spruce Avenue, Riverside, CA 92501', 'Michelle Moore', '555-1014', 'United Healthcare', 'UH-321654', 'B-', 'Aspirin'),
('PAT008', 'Jessica', 'Taylor', '1994-08-17', 'Female', '555-1015', 'jessica.taylor@email.com', '258 Willow Drive, Santa Ana, CA 92701', 'Brian Taylor', '555-1016', 'Anthem', 'ANT-654987', 'O+', 'Cats'),
('PAT009', 'Daniel', 'Anderson', '1987-06-09', 'Male', '555-1017', 'daniel.anderson@email.com', '369 Poplar Lane, Anaheim, CA 92801', 'Sarah Anderson', '555-1018', 'Molina Healthcare', 'MOL-987321', 'A-', 'None'),
('PAT010', 'Amanda', 'Thomas', '1990-02-14', 'Female', '555-1019', 'amanda.thomas@email.com', '741 Hickory Court, Bakersfield, CA 93301', 'James Thomas', '555-1020', 'Blue Cross', 'BC-159753', 'AB-', 'Iodine'),
('PAT011', 'Matthew', 'Jackson', '1986-10-28', 'Male', '555-1021', 'matthew.jackson@email.com', '852 Cypress Street, Modesto, CA 95350', 'Emily Jackson', '555-1022', 'Kaiser Permanente', 'KP-357159', 'B+', 'Peanuts'),
('PAT012', 'Sarah', 'White', '1993-05-11', 'Female', '555-1023', 'sarah.white@email.com', '963 Redwood Avenue, Stockton, CA 95202', 'Kevin White', '555-1024', 'Aetna', 'AET-753951', 'O-', 'Sulfa drugs'),
('PAT013', 'Kevin', 'Harris', '1989-01-07', 'Male', '555-1025', 'kevin.harris@email.com', '159 Sequoia Drive, Fremont, CA 94536', 'Laura Harris', '555-1026', 'Cigna', 'CIG-951357', 'A+', 'None'),
('PAT014', 'Michelle', 'Martin', '1984-09-23', 'Female', '555-1027', 'michelle.martin@email.com', '357 Magnolia Lane, Hayward, CA 94541', 'Robert Martin', '555-1028', 'United Healthcare', 'UH-159357', 'B-', 'Bee stings'),
('PAT015', 'Brian', 'Lee', '1996-03-19', 'Male', '555-1029', 'brian.lee@email.com', '753 Sycamore Court, Concord, CA 94520', 'Anna Lee', '555-1030', 'Anthem', 'ANT-357951', 'O+', 'Morphine');

-- Insert sample appointments
INSERT INTO medical_appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, status, reason_for_visit, diagnosis_code) VALUES
('APT001', 'PAT001', 'DOC001', '2024-01-15', '09:00:00', 'completed', 'Chest pain and shortness of breath', 'I25.10'),
('APT002', 'PAT002', 'DOC003', '2024-01-16', '10:30:00', 'completed', 'Skin rash and itching', 'L30.9'),
('APT003', 'PAT003', 'DOC002', '2024-01-17', '14:00:00', 'completed', 'Knee pain after sports injury', 'S83.9'),
('APT004', 'PAT004', 'DOC005', '2024-01-18', '11:15:00', 'completed', 'Anxiety and depression symptoms', 'F41.9'),
('APT005', 'PAT005', 'DOC004', '2024-01-19', '08:30:00', 'completed', 'Annual physical examination', 'Z00.00'),
('APT006', 'PAT006', 'DOC001', '2024-01-22', '13:45:00', 'completed', 'High blood pressure follow-up', 'I10'),
('APT007', 'PAT007', 'DOC003', '2024-01-23', '15:30:00', 'completed', 'Suspicious mole examination', 'D23.9'),
('APT008', 'PAT008', 'DOC004', '2024-01-24', '09:45:00', 'completed', 'Persistent headaches', 'G44.1'),
('APT009', 'PAT009', 'DOC002', '2024-01-25', '16:00:00', 'completed', 'Lower back pain', 'M54.5'),
('APT010', 'PAT010', 'DOC005', '2024-01-26', '10:00:00', 'completed', 'Sleep disorders and insomnia', 'G47.00'),
('APT011', 'PAT011', 'DOC001', '2024-01-29', '12:30:00', 'completed', 'Irregular heartbeat', 'I49.9'),
('APT012', 'PAT012', 'DOC004', '2024-01-30', '14:15:00', 'completed', 'Digestive issues and stomach pain', 'K59.9'),
('APT013', 'PAT013', 'DOC003', '2024-01-31', '11:00:00', 'completed', 'Acne treatment consultation', 'L70.9'),
('APT014', 'PAT014', 'DOC002', '2024-02-01', '08:45:00', 'completed', 'Shoulder impingement syndrome', 'M75.4'),
('APT015', 'PAT015', 'DOC005', '2024-02-02', '15:00:00', 'completed', 'ADHD evaluation', 'F90.9'),
('APT016', 'PAT001', 'DOC004', '2024-02-05', '09:30:00', 'completed', 'Follow-up for cardiac medication', 'Z51.81'),
('APT017', 'PAT003', 'DOC001', '2024-02-06', '13:00:00', 'completed', 'Chest x-ray results discussion', 'Z51.11'),
('APT018', 'PAT005', 'DOC002', '2024-02-07', '10:45:00', 'completed', 'Physical therapy consultation', 'Z51.89'),
('APT019', 'PAT007', 'DOC004', '2024-02-08', '16:30:00', 'completed', 'Diabetes screening', 'Z13.1'),
('APT020', 'PAT009', 'DOC005', '2024-02-09', '11:30:00', 'completed', 'Stress management counseling', 'Z71.9');