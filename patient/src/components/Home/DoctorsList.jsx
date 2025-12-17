import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { User, Award, Building, Send, Stethoscope, CheckCircle } from 'lucide-react';

function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [requestSent, setRequestSent] = useState({});
  const { user } = useSelector((state) => state?.patient);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/doctor/all");
        setDoctors(res.data.doctors);
      } catch (error) {
        console.error("Failed to load doctors:", error);
      }
    };

    fetchDoctors();
  }, []);

  const sendRequest = async (docId) => {
    try {
      await axios.post("http://localhost:3000/api/connection/send", {
        patientId: user?._id,
        docId,
      });
      setRequestSent((prev) => ({ ...prev, [docId]: true }));
      alert("Connection request sent successfully!");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to send request");
    }
  };

  return (
    <div>
      {doctors.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="text-indigo-600" size={48} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Doctors Available</h3>
          <p className="text-gray-600">Check back later for available doctors</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-100 rounded-2xl shadow-lg hover:shadow-xl transition-all p-6"
            >
              {/* Doctor Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{doc.name}</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award size={16} className="text-indigo-600" />
                      <span className="text-sm font-medium">{doc.experience} years of experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building size={16} className="text-indigo-600" />
                      <span className="text-sm font-medium">{doc.hospital}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specializations (if available) */}
              {doc.specialization && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <Stethoscope size={16} className="text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">Specialization:</span>
                  <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                    {doc.specialization}
                  </span>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={() => sendRequest(doc._id)}
                disabled={requestSent[doc._id]}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  requestSent[doc._id]
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:scale-105'
                }`}
              >
                {requestSent[doc._id] ? (
                  <>
                    <CheckCircle size={20} />
                    Request Sent
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send Connection Request
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorsList;