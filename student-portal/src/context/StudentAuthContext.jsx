import React, { createContext, useContext, useState, useCallback } from 'react';
import { setStudentToken } from '../utils/api';

const Ctx = createContext(null);

export function StudentAuthProvider({ children }) {
  const [student, setStudent]         = useState(null);
  const [institution, setInstitution] = useState(null);
  const [token, setToken]             = useState(null);

  const login = useCallback(({ studentToken, student: s, institution: inst }) => {
    setToken(studentToken);
    setStudent(s);
    setInstitution(inst);
    setStudentToken(studentToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStudent(null);
    setInstitution(null);
    setStudentToken(null);
  }, []);

  return (
    <Ctx.Provider value={{ student, institution, token, login, logout, isAuthed: !!token }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStudentAuth() { return useContext(Ctx); }
