const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if(title && author && email && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];

      if(!['jpg', 'gif', 'png'].includes(fileExt)){
        throw new Error('Wrong file extension')
      } 
      if(title.length > 25){
        throw new Error('Too long photo title')
      }
      if(author.length > 50){
        throw new Error('Too long author name')
      }

      const pattern = new RegExp(/(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/, 'g');

      const titleMatched = title.match(pattern).join('');
      if(titleMatched.length < title.length) throw new Error('Invalid characters...');
    
      const authorMatched = author.match(pattern).join('');
      if(authorMatched.length < author.length) throw new Error('Invalid characters...');

      const emailPattern = /^[A-Z|a-z|0-9]+@+[A-Z|a-z|0-9]+\.[a-zA-Z]{2,4}$/;
      const emailMatched = email.match(emailPattern).join('');
      if(emailMatched.length < email.length) throw new Error('Wrong email format');

      const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);
      
    } else {
      throw new Error('Wrong input!');
    }
  } catch(err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if(!photoToUpdate) res.status(404).json({ message: 'Not found' });

    const validVote = () => {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    };

    const clientIp = requestIp.getClientIp(req); 
    const voter = await Voter.findOne({ user: clientIp });

    if(voter) {
      const vote = voter.votes.find(item => item == req.params.id);
      if(!vote){
        voter.votes.push(req.params.id)
        await voter.save();
        validVote();
      } else {
        res.status(500).json('You have already voted for this pic!');
      }
    } else {
      const newVoter = new Voter({ user: clientIp, votes: [req.params.id] });
      await newVoter.save();
      validVote();
    }
  } catch(err) {
    res.status(500).json(err);
  }
};
