-- Create additional medical tables
CREATE TABLE IF NOT EXISTS medical_records (
    record_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id),
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id),
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    appointment_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT
);

-- Insert sample medical records
INSERT INTO medical_records (patient_id, doctor_id, diagnosis, treatment, notes) VALUES
(1, 1, 'Hypertension', 'Lisinopril 10mg daily', 'Monitor blood pressure weekly, follow-up in 3 months'),
(2, 2, 'Annual physical exam', 'Routine checkup', 'All vitals normal, recommended annual screening'),
(3, 1, 'Chest pain evaluation', 'EKG, stress test ordered', 'Patient reports occasional chest discomfort'),
(4, 3, 'Pediatric wellness visit', 'Vaccinations up to date', 'Growth and development normal for age'),
(5, 2, 'Type 2 Diabetes', 'Metformin 500mg twice daily', 'Diet counseling provided, HbA1c monitoring needed');

-- Insert sample appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES
(1, 1, '2024-07-15 10:00:00', 'scheduled', 'Follow-up for hypertension'),
(2, 2, '2024-07-16 14:30:00', 'scheduled', 'Annual physical exam'),
(3, 1, '2024-07-17 09:15:00', 'completed', 'Chest pain consultation'),
(4, 3, '2024-07-18 11:00:00', 'scheduled', 'Pediatric checkup'),
(5, 2, '2024-07-19 15:45:00', 'scheduled', 'Diabetes management');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
