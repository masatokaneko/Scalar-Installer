-- Create medical tables for ScalarDB
CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample patients
INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email) VALUES
('John', 'Doe', '1985-03-15', 'Male', '555-0101', 'john.doe@email.com'),
('Jane', 'Smith', '1992-07-22', 'Female', '555-0102', 'jane.smith@email.com'),
('Robert', 'Johnson', '1978-11-05', 'Male', '555-0103', 'robert.j@email.com'),
('Emily', 'Davis', '1990-09-12', 'Female', '555-0104', 'emily.davis@email.com'),
('Michael', 'Wilson', '1983-06-28', 'Male', '555-0105', 'michael.w@email.com');

-- Insert sample doctors
INSERT INTO doctors (first_name, last_name, specialty, phone, email) VALUES
('Sarah', 'Wilson', 'Cardiology', '555-0201', 'dr.wilson@hospital.com'),
('Michael', 'Brown', 'General Practice', '555-0202', 'dr.brown@hospital.com'),
('Lisa', 'Garcia', 'Pediatrics', '555-0203', 'dr.garcia@hospital.com'),
('David', 'Lee', 'Orthopedics', '555-0204', 'dr.lee@hospital.com');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
