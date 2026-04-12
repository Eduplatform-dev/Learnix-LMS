// Excel/CSV export utility for admin reports
// No external dependencies — uses pure CSV which Excel opens natively

export function exportToCSV(data: Record<string, any>[], filename: string, columns?: { key: string; label: string }[]) {
  if (data.length === 0) { alert("No data to export"); return; }

  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);
  const headers = columns ? columns.map(c => c.label) : keys;

  const rows = [
    headers,
    ...data.map(row =>
      keys.map(key => {
        const val = getNestedValue(row, key);
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val).replace(/"/g, '""');
      })
    ),
  ];

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const BOM  = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getNestedValue(obj: any, key: string): any {
  return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

// ─── Pre-built export functions ───────────────────────────────

export function exportStudentList(students: any[]) {
  exportToCSV(students, "student_list", [
    { key: "username",                    label: "Username"         },
    { key: "email",                       label: "Email"            },
    { key: "profile.fullName",            label: "Full Name"        },
    { key: "profile.enrollmentNumber",    label: "Enrollment No."   },
    { key: "profile.department.name",     label: "Department"       },
    { key: "profile.year",                label: "Year"             },
    { key: "profile.division",            label: "Division"         },
    { key: "profile.rollNumber",          label: "Roll No."         },
    { key: "profile.phoneNumber",         label: "Phone"            },
    { key: "profile.category",            label: "Category"         },
    { key: "profile.parentName",          label: "Parent Name"      },
    { key: "profile.parentPhone",         label: "Parent Phone"     },
    { key: "createdAt",                   label: "Registered On"    },
  ]);
}

export function exportFeeReport(fees: any[]) {
  exportToCSV(fees, "fee_report", [
    { key: "student.username", label: "Student"     },
    { key: "student.email",    label: "Email"       },
    { key: "invoice",          label: "Invoice No." },
    { key: "description",      label: "Description" },
    { key: "category",         label: "Category"    },
    { key: "semester",         label: "Semester"    },
    { key: "amount",           label: "Amount (₹)"  },
    { key: "status",           label: "Status"      },
    { key: "dueDate",          label: "Due Date"    },
    { key: "paidAt",           label: "Paid On"     },
  ]);
}

export function exportSubmissionsReport(submissions: any[]) {
  exportToCSV(submissions, "submissions_report", [
    { key: "studentName",      label: "Student"          },
    { key: "assignmentTitle",  label: "Assignment"       },
    { key: "course",           label: "Course"           },
    { key: "status",           label: "Status"           },
    { key: "grade",            label: "Grade"            },
    { key: "feedback",         label: "Feedback"         },
    { key: "createdAt",        label: "Submitted On"     },
    { key: "gradedAt",         label: "Graded On"        },
  ]);
}

export function exportResultsReport(results: any[]) {
  exportToCSV(results.flatMap(r =>
    r.subjects.map((s: any) => ({
      student:        r.student?.username || "—",
      email:          r.student?.email    || "—",
      enrollment:     r.enrollmentNumber  || "—",
      academicYear:   r.academicYear,
      semester:       r.semesterNumber,
      subject:        s.subject,
      subjectCode:    s.subjectCode       || "—",
      internalMarks:  s.internalMarks,
      externalMarks:  s.externalMarks,
      totalMarks:     s.totalMarks,
      maxMarks:       s.maxMarks,
      grade:          s.grade             || "—",
      credits:        s.credits,
      status:         s.status,
      percentage:     r.percentage,
      sgpa:           r.sgpa,
      result:         r.result,
    }))
  ), "results_report", [
    { key: "student",       label: "Student"       },
    { key: "email",         label: "Email"         },
    { key: "enrollment",    label: "Enrollment"    },
    { key: "academicYear",  label: "Academic Year" },
    { key: "semester",      label: "Semester"      },
    { key: "subject",       label: "Subject"       },
    { key: "subjectCode",   label: "Code"          },
    { key: "internalMarks", label: "Internal"      },
    { key: "externalMarks", label: "External"      },
    { key: "totalMarks",    label: "Total"         },
    { key: "maxMarks",      label: "Max"           },
    { key: "grade",         label: "Grade"         },
    { key: "credits",       label: "Credits"       },
    { key: "status",        label: "Status"        },
    { key: "percentage",    label: "Percentage %"  },
    { key: "sgpa",          label: "SGPA"          },
    { key: "result",        label: "Result"        },
  ]);
}

export function exportExamSchedule(exams: any[]) {
  exportToCSV(exams, "exam_schedule", [
    { key: "title",          label: "Exam Title"    },
    { key: "subject",        label: "Subject"       },
    { key: "subjectCode",    label: "Code"          },
    { key: "examType",       label: "Type"          },
    { key: "department.name",label: "Department"    },
    { key: "semesterNumber", label: "Semester"      },
    { key: "examDate",       label: "Date"          },
    { key: "startTime",      label: "Start Time"    },
    { key: "endTime",        label: "End Time"      },
    { key: "duration",       label: "Duration (min)"},
    { key: "room",           label: "Room"          },
    { key: "building",       label: "Building"      },
    { key: "totalMarks",     label: "Total Marks"   },
    { key: "passingMarks",   label: "Passing Marks" },
    { key: "status",         label: "Status"        },
  ]);
}
