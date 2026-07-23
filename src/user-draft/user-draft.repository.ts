// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./user-draft.repository.mock') : require('./user-draft.repository.prisma');
export const UserDraftRepository = impl.UserDraftRepository;
export default UserDraftRepository;
// Note: keep only runtime value export; do not export conflicting type alias