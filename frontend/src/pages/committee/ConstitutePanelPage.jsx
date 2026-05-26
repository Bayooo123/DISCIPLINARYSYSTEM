import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CommitteeCommitteeLayout from '../../components/CommitteeCommitteeLayout';

export default function ConstitutePanelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([
    { userId: '', panelRole: 'chairperson' },
    { userId: '', panelRole: 'secretary' },
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/admin/users')
      .then(data => setUsers(data.filter(u =>
        ['committee_member', 'panel_member'].includes(u.role) && u.is_active
      )))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function updateMember(index, field, value) {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function addMember() {
    if (members.length >= 6) return;
    setMembers(prev => [...prev, { userId: '', panelRole: 'member' }]);
  }

  function removeMember(index) {
    if (members.length <= 2) return;
    setMembers(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const selectedIds = members.map(m => m.userId).filter(Boolean);
    if (selectedIds.length < 2) {
      setError('Please assign at least a chairperson and a secretary.');
      return;
    }
    if (new Set(selectedIds).size !== selectedIds.length) {
      setError('Each panel member must be a different person.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/cases/${id}/panel`, { members: members.filter(m => m.userId) });
      navigate(`/committee/cases/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CommitteeLayout title="Constitute Panel">
      <div className="max-w-2xl mx-auto">
        <Link to={`/committee/cases/${id}`} className="text-sm text-brand hover:underline mb-6 inline-block">
          ← Back to case
        </Link>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500 mb-6">
            Assign committee and panel members to hear this case. The panel must include
            at least a chairperson and a secretary. All members will be notified immediately.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading members…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {members.map((m, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                      {m.panelRole}
                    </label>
                    <select
                      value={m.userId}
                      onChange={e => updateMember(i, 'userId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Select a member…</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace(/_/g, ' ')})</option>
                      ))}
                    </select>
                  </div>

                  {i >= 2 && (
                    <button
                      type="button"
                      onClick={() => removeMember(i)}
                      className="mt-5 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {members.length < 6 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="text-sm text-brand hover:underline"
                >
                  + Add another member
                </button>
              )}

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {submitting ? 'Constituting panel…' : 'Constitute Panel & Notify Members'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </CommitteeLayout>
  );
}
