"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  designation?: string;
  status: string;
}

interface Attendance {
  id: number;
  employee_id: number;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  method: string;
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<
    Record<number, Attendance>
  >({});

  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState<number | null>(
    null
  );

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    designation: "",
  });

  // ============================================================
  // FETCH EMPLOYEES
  // ============================================================

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/employees"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data: Employee[] = await response.json();

      setEmployees(data);
      setError("");
    } catch (error) {
      console.error(error);
      setError("Unable to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH ATTENDANCE
  // ============================================================

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/attendance"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data: Attendance[] = await response.json();

      /*
       * Use local date instead of UTC date.
       * This prevents attendance from showing under
       * the wrong day depending on timezone.
       */
      const now = new Date();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      const today = `${year}-${month}-${day}`;

      const todayAttendance: Record<number, Attendance> = {};

      data.forEach((record) => {
        if (record.attendance_date === today) {
          todayAttendance[record.employee_id] = record;
        }
      });

      setAttendance(todayAttendance);
    } catch (error) {
      console.error(error);
      setError("Unable to load attendance data");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  // ============================================================
  // ADD EMPLOYEE
  // ============================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/employees",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create employee"
        );
      }

      await fetchEmployees();

      setForm({
        employee_code: "",
        first_name: "",
        last_name: "",
        email: "",
        department: "",
        designation: "",
      });

      setShowForm(false);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to create employee");
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CHECK IN
  // ============================================================

  const handleCheckIn = async (employeeId: number) => {
    setActionLoading(employeeId);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/attendance/check-in",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: employeeId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to check in"
        );
      }

      await fetchAttendance();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to check in");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // CHECK OUT
  // ============================================================

  const handleCheckOut = async (employeeId: number) => {
    setActionLoading(employeeId);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/attendance/check-out",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: employeeId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to check out"
        );
      }

      await fetchAttendance();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to check out");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // DASHBOARD COUNTS
  // ============================================================

  const presentToday = employees.filter(
    (employee) => attendance[employee.id]
  ).length;

  const absentToday =
    employees.length - presentToday;

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (
    time: string | null
  ) => {
    if (!time) {
      return "-";
    }

    const [hours, minutes] = time.split(":");

    const hour = Number(hours);

    const suffix = hour >= 12 ? "PM" : "AM";

    const formattedHour =
      hour % 12 === 0 ? 12 : hour % 12;

    return `${formattedHour}:${minutes} ${suffix}`;
  };

  // ============================================================
  // RETURN UI
  // ============================================================

  return (
    <main className="min-h-screen bg-gray-100">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Attendance Management
            </h1>

            <p className="text-sm text-gray-500">
              Face Recognition & Biometric System
            </p>
          </div>

          <div className="text-sm text-gray-600">
            Admin
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ====================================================
            DASHBOARD CARDS
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Total Employees */}

          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Total Employees
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {employees.length}
            </p>

          </div>

          {/* Present */}

          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Present Today
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {presentToday}
            </p>

          </div>

          {/* Absent */}

          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Absent Today
            </p>

            <p className="text-3xl font-bold text-red-600 mt-2">
              {absentToday}
            </p>

          </div>

        </div>

        {/* ====================================================
            EMPLOYEES
        ==================================================== */}

        <div className="bg-white rounded-xl shadow-sm">

          {/* Section Header */}

          <div className="px-6 py-5 border-b flex justify-between items-center">

            <div>

              <h2 className="text-lg font-semibold text-gray-900">
                Employees
              </h2>

              <p className="text-sm text-gray-500">
                Registered employees
              </p>

            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              + Add Employee
            </button>

          </div>

          {/* Error */}

          {error && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Loading */}

          {(loading || attendanceLoading) && (
            <div className="p-6 text-gray-500">
              Loading employees and attendance...
            </div>
          )}

          {/* ==================================================
              TABLE
          ================================================== */}

          {!loading && !attendanceLoading && (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Employee
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Department
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Designation
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Attendance
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Actions
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {employees.map((employee) => {

                    const employeeAttendance =
                      attendance[employee.id];

                    const hasCheckedIn =
                      !!employeeAttendance;

                    const hasCheckedOut =
                      !!employeeAttendance?.check_out;

                    const isProcessing =
                      actionLoading === employee.id;

                    return (

                      <tr
                        key={employee.id}
                        className="hover:bg-gray-50"
                      >

                        {/* Employee */}

                        <td className="px-6 py-4">

                          <div className="font-medium text-gray-900">
                            {employee.first_name}{" "}
                            {employee.last_name}
                          </div>

                          <div className="text-sm text-gray-500">
                            {employee.employee_code}
                          </div>

                        </td>

                        {/* Department */}

                        <td className="px-6 py-4 text-gray-700">
                          {employee.department || "-"}
                        </td>

                        {/* Designation */}

                        <td className="px-6 py-4 text-gray-700">
                          {employee.designation || "-"}
                        </td>

                        {/* Attendance */}

                        <td className="px-6 py-4">

                          {hasCheckedIn ? (

                            <div className="space-y-1">

                              <div className="text-sm text-green-700 font-medium">
                                Present
                              </div>

                              <div className="text-xs text-gray-500">
                                In:{" "}
                                {formatTime(
                                  employeeAttendance.check_in
                                )}
                              </div>

                              <div className="text-xs text-gray-500">
                                Out:{" "}
                                {formatTime(
                                  employeeAttendance.check_out
                                )}
                              </div>

                            </div>

                          ) : (

                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Absent
                            </span>

                          )}

                        </td>

                        {/* Actions */}

                        <td className="px-6 py-4">

                          <div className="flex gap-2">

                            {/* Check In */}

                            <button
                              onClick={() =>
                                handleCheckIn(employee.id)
                              }
                              disabled={
                                hasCheckedIn ||
                                isProcessing ||
                                employee.status !== "active"
                              }
                              className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {isProcessing
                                ? "Processing..."
                                : hasCheckedIn
                                ? "Checked In"
                                : "Check In"}
                            </button>

                            {/* Check Out */}

                            <button
                              onClick={() =>
                                handleCheckOut(employee.id)
                              }
                              disabled={
                                !hasCheckedIn ||
                                hasCheckedOut ||
                                isProcessing ||
                                employee.status !== "active"
                              }
                              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {hasCheckedOut
                                ? "Checked Out"
                                : "Check Out"}
                            </button>

                          </div>

                        </td>

                        {/* Employee Status */}

                        <td className="px-6 py-4">

                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {employee.status}
                          </span>

                        </td>

                      </tr>

                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

      {/* ======================================================
          ADD EMPLOYEE MODAL
      ====================================================== */}

      {showForm && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

            {/* Modal Header */}

            <div className="px-6 py-5 border-b">

              <h2 className="text-xl font-semibold">
                Add New Employee
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Register an employee before enrolling their face.
              </p>

            </div>

            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
            >

              {/* Employee Code */}

              <div>

                <label className="block text-sm font-medium mb-1">
                  Employee Code
                </label>

                <input
                  name="employee_code"
                  value={form.employee_code}
                  onChange={handleChange}
                  placeholder="EMP003"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />

              </div>

              {/* First / Last Name */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>

                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>

                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />

                </div>

              </div>

              {/* Email */}

              <div>

                <label className="block text-sm font-medium mb-1">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />

              </div>

              {/* Department / Designation */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-1">
                    Department
                  </label>

                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-1">
                    Designation
                  </label>

                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />

                </div>

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 pt-4">

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Add Employee"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}