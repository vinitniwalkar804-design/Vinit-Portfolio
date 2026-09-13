const Message = require('../../models/Message');

exports.listMessages = async (req, res) => {
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const q = {};
  if (unreadOnly) q.read = false;

  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 200));
  const messages = await Message.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  const unread = await Message.countDocuments({ read: false });

  res.json({
    success: true,
    data: messages,
    meta: { unread, total: messages.length }
  });
};

exports.markRead = async (req, res) => {
  const read = req.body && Object.prototype.hasOwnProperty.call(req.body, 'read')
    ? !!req.body.read
    : undefined;
  const item = await Message.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Message not found.' });

  if (read !== undefined && read !== item.read) {
    item.read = read;
    item.readAt = read ? new Date() : null;
    await item.save();
  }
  res.json({ success: true, data: item });
};

exports.deleteMessage = async (req, res) => {
  const item = await Message.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, data: { id: req.params.id } });
};