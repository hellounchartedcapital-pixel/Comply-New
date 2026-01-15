import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Shield, UserPlus, Trash2, CheckCircle, AlertCircle, Crown, Eye } from 'lucide-react';
import { supabase } from './supabaseClient';

export function TeamManagement({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load user's organization
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw membershipError;
      }

      if (!membership) {
        setError('No organization found. Please contact support.');
        setLoading(false);
        return;
      }

      setOrganization(membership.organizations);

      // Load all team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          user:user_id (
            email
          )
        `)
        .eq('organization_id', membership.organizations.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;
      setTeamMembers(members || []);

      // Load pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', membership.organizations.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setPendingInvitations(invitations || []);

    } catch (err) {
      console.error('Error loading team data:', err);
      setError('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      setError(null);
      setSuccess(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a unique invitation token
      const token = crypto.randomUUID();

      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: organization.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          invited_by: user.id,
          token
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          throw new Error('This email has already been invited');
        }
        throw inviteError;
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');

      // Reload invitations
      await loadTeamData();

    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      setSuccess('Invitation cancelled');
      await loadTeamData();
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError('Failed to cancel invitation');
    }
  };

  // Role update functionality - reserved for future use
  // const handleUpdateMemberRole = async (memberId, newRole) => {
  //   try {
  //     const { error } = await supabase
  //       .from('team_members')
  //       .update({ role: newRole })
  //       .eq('id', memberId);
  //
  //     if (error) throw error;
  //
  //     setSuccess('Member role updated');
  //     await loadTeamData();
  //   } catch (err) {
  //     console.error('Error updating member role:', err);
  //     setError('Failed to update member role');
  //   }
  // };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'suspended' })
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Member removed from team');
      await loadTeamData();
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <Crown size={16} className="text-amber-500" />;
    if (role === 'viewer') return <Eye size={16} className="text-blue-500" />;
    return <Shield size={16} className="text-green-500" />;
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-amber-100 text-amber-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
        {role.toUpperCase()}
      </span>
    );
  };

  const currentUserMember = teamMembers.find(m => m.user_id === (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  })());
  const isAdmin = currentUserMember?.role === 'admin';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full p-6 sm:p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <Users className="text-green-600" size={24} />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Team Management</h2>
              {organization && (
                <p className="text-xs sm:text-sm text-gray-500">{organization.name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
              <p className="text-sm sm:text-base text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm sm:text-base text-red-800">{error}</p>
            </div>
          )}

          {/* Invite Section (Admin Only) */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                <UserPlus size={20} className="mr-2" />
                Invite Team Member
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  disabled={inviting}
                />

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-sm sm:text-base"
                  disabled={inviting}
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail}
                  className="px-4 sm:px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium flex items-center justify-center space-x-2 text-sm sm:text-base whitespace-nowrap"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mt-3">
                <strong>Roles:</strong> Admin (full access), Member (manage vendors), Viewer (read-only)
              </p>
            </div>
          )}

          {/* Team Members */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-4">
              Team Members ({teamMembers.length})
            </h3>

            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                    {getRoleIcon(member.role)}
                    <div>
                      <p className="font-medium text-sm sm:text-base">{member.user?.email || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {getRoleBadge(member.role)}

                    {isAdmin && member.user_id !== currentUserMember?.user_id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                Pending Invitations ({pendingInvitations.length})
              </h3>

              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <p className="font-medium text-sm sm:text-base">{invitation.email}</p>
                      <p className="text-xs text-gray-600">
                        Invited {new Date(invitation.invited_at).toLocaleDateString()} •
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3 mt-2 sm:mt-0">
                      {getRoleBadge(invitation.role)}

                      {isAdmin && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm sm:text-base"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
