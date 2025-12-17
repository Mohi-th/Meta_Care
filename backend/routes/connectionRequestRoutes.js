import express from 'express';
const router = express.Router();
import {
  sendConnectionRequest,
  updateConnectionRequestStatus,
  getDoctorConnectionRequests,
  getConnectedDoctors
} from '../controllers/connectionRequestController.js';

router.post('/send', sendConnectionRequest);
router.post('/update-status', updateConnectionRequestStatus);
router.get('/doctor/:docId', getDoctorConnectionRequests);
router.get('/connected/:patientId', getConnectedDoctors);

export default router;
