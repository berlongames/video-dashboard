module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    total_uploads: 0,
    total_views: 0,
    total_likes: 0,
    total_comments: 0,
    recent: [],
  });
};
