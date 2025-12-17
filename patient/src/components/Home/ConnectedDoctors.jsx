import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketProvider';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Video, Phone, Mic, MicOff, VideoOff, Calendar, Clock, User, Building, Award, CheckCircle2 } from 'lucide-react';

const FIXED_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

function ConnectedDoctors({ patientId, scheduleNotification }) {
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({});
  const [selectedSlots, setSelectedSlots] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [doctorOnline, setDoctorOnline] = useState({});
  const socket = useSocket();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const [isMicMuted, setMicMuted] = useState(false);
  const [isVideoMuted, setVideoMuted] = useState(false);

  const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  const fetchConnectedDoctors = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/connection/connected/${patientId}`);
      setDoctors(res.data.doctors);
    } catch (error) {
      console.error('Failed to fetch connected doctors', error);
    }
  };

  const fetchAvailableSlots = async (docId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/appointments/slots/${docId}`);
      setAvailableSlots((prev) => ({
        ...prev,
        [docId]: res.data.bookedSlots
      }));
    } catch (err) {
      console.error(`Error fetching slots for ${docId}`, err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/appointments/patient/${patientId}`);
      setAppointments(res.data.appointments);
    } catch (err) {
      console.error("Failed to load appointments", err);
    }
  };

  const handleBookSlot = async (docId) => {
    const selectedTime = selectedSlots[docId];
    if (!selectedTime) return alert('Please select a time slot first.');

    scheduleNotification(selectedTime);

    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/appointments/book`, {
        patientId,
        docId,
        time: selectedTime,
      });
      alert(`Appointment booked at ${selectedTime}`);
      fetchAvailableSlots(docId);
      fetchAppointments();
      setSelectedSlots((prev) => ({ ...prev, [docId]: null }));
    } catch (err) {
      alert('Booking failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleJoinCall = async (roomId) => {
    setJoinedRoom(roomId);
    socket.emit("patient-joined", { roomId });

    localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = localStream.current;

    peerConnection.current = new RTCPeerConnection(servers);
    localStream.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, roomId });
      }
    };

    socket.emit('ready', { roomId });

    socket.on('receive-offer', async (offer) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { answer, roomId });
    });

    socket.on('receive-answer', async (answer) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('receive-ice-candidate', async (candidate) => {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    setJoinedRoom(null);
  };

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoMuted(!videoTrack.enabled);
    }
  };

  useEffect(() => {
    fetchConnectedDoctors();
    fetchAppointments();

    if (socket && patientId) {
      socket.emit('register', { userId: patientId });

      socket.on('doctor-joined', ({ appointmentId }) => {
        setDoctorOnline((prev) => ({ ...prev, [appointmentId]: true }));
      });

      socket.on('connection-response', (data) => {
        if (data.status === 'accepted' && data.patientId === patientId) {
          alert("A doctor has accepted your request!");
          fetchConnectedDoctors();
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('doctor-joined');
        socket.off('connection-response');
        socket.off('offer');
        socket.off('ice-candidate');
        socket.off('receive-offer');
        socket.off('receive-answer');
        socket.off('receive-ice-candidate');
      }
    };
  }, [socket, patientId]);

  useEffect(() => {
    doctors.forEach((doc) => {
      fetchAvailableSlots(doc._id);
    });
  }, [doctors]);

  return (
    <div>
      {doctors.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-blue-600" size={48} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Connected Doctors</h3>
          <p className="text-gray-600">Connect with doctors to start booking appointments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {doctors?.map((doc) => {
            const booked = availableSlots[doc?._id] || [];
            const selected = selectedSlots[doc?._id];
            const myAppointment = appointments.find(a => a.docId._id === doc._id);

            return (
              <div key={doc._id} className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 rounded-2xl shadow-lg hover:shadow-xl transition-all p-6">
                {/* Doctor Info */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="text-white" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{doc.name}</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} />
                        <span className="text-sm">{doc.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Award size={16} />
                        <span className="text-sm">{doc.experience} years experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building size={16} />
                        <span className="text-sm">{doc.hospital}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Call or Slot Booking */}
                {myAppointment ? (
                  <Dialog open={joinedRoom === myAppointment._id} onOpenChange={(isOpen) => !isOpen && endCall()}>
                    <DialogTrigger asChild>
                      <button
                        onClick={() => handleJoinCall(myAppointment._id)}
                        disabled={!doctorOnline[myAppointment._id]}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                          doctorOnline[myAppointment._id]
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:scale-105'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Video size={20} />
                        {doctorOnline[myAppointment._id] ? 'Join Video Call' : 'Waiting for Doctor...'}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="p-0 h-[98vh] w-full max-w-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          <Video size={28} />
                          Video Consultation
                        </h3>
                      </div>

                      {/* Video Grid */}
                      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
                        <div className="relative flex-1 bg-black rounded-xl overflow-hidden border-4 border-blue-500 shadow-2xl">
                          <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1.5 rounded-lg">
                            <p className="text-white text-sm font-semibold">You</p>
                          </div>
                        </div>

                        <div className="relative flex-1 bg-black rounded-xl overflow-hidden border-4 border-green-500 shadow-2xl">
                          <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1.5 rounded-lg">
                            <p className="text-white text-sm font-semibold">Dr. {doc.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="bg-gray-800 p-6 flex gap-3 justify-center flex-wrap">
                        <button
                          onClick={toggleMic}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            isMicMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                          } text-white`}
                        >
                          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                          {isMicMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          onClick={toggleVideo}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            isVideoMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                          } text-white`}
                        >
                          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                          {isVideoMuted ? 'Start Video' : 'Stop Video'}
                        </button>
                        <button
                          onClick={endCall}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
                        >
                          <Phone size={20} />
                          End Call
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="text-blue-600" size={20} />
                      <p className="font-semibold text-gray-800">Available Time Slots</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FIXED_SLOTS.map((slot) => {
                        const isBooked = booked.includes(slot);
                        const isSelected = selected === slot;

                        return (
                          <button
                            key={slot}
                            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                              isBooked
                                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                : isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                                : 'bg-white text-gray-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                            disabled={isBooked}
                            onClick={() => setSelectedSlots(prev => ({ ...prev, [doc._id]: slot }))}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>

                    {selected && (
                      <button
                        onClick={() => handleBookSlot(doc._id)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <CheckCircle2 size={20} />
                        Book Appointment at {selected}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ConnectedDoctors;