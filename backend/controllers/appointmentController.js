import Appointment from '../models/Appointment.js';

export const bookAppointment = async (req, res) => {
  const { patientId, docId, time } = req.body;

  console.log(time)

  try {
    // Check if the slot is already taken
    const existing = await Appointment.findOne({ docId, scheduleTime: time });
    console.log(existing)
    if (existing) {
      return res.status(400).json({ message: 'Slot already booked' });
    }

    // Create appointment (roomId will be _id)
    const newAppointment = await Appointment.create({
      patientId,
      docId,
      scheduleTime: time,
    });

    // Use MongoDB _id as roomId
    newAppointment.roomId = newAppointment._id.toString();
    await newAppointment.save();

    res.status(201).json({
      message: 'Appointment booked',
      appointment: {
        ...newAppointment._doc,
        roomId: newAppointment._id.toString()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Booking failed', error: error.message });
  }
};

export const getAvailableSlots = async (req, res) => {
  const { docId } = req.params;

  const FIXED_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

  try {
    const bookedAppointments = await Appointment.find({ docId }).select('scheduleTime');
    const bookedTimes = bookedAppointments.map(a => a.scheduleTime);

    const availableSlots = FIXED_SLOTS.map(slot => ({
      time: slot,
      isBooked: bookedTimes.includes(slot)
    }));

    res.json({ availableSlots });
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch slots', error: error.message });
  }
};


// GET /api/appointments/doctor/:docId

export const getAppointmentsForDoctor = async (req, res) => {
  try {
    const { docId } = req.params;

    const appointments = await Appointment.find({ docId })
      .populate('patientId', 'name phone')   // only show name and phone of patient
      .populate('docId', 'name hospital');   // optional: include doctor info

    res.status(200).json({ appointments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: err.message });
  }
};

export const getAppointmentsByPatient = async (req, res) => {
  const { patientId } = req.params;

  try {
    const appointments = await Appointment.find({ patientId })
      .populate('docId', 'name phone hospital') // Optional
      .populate('patientId', 'name phone');     // Optional

    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch patient appointments' });
  }
};

