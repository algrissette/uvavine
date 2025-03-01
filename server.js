import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jsonwebtoken from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin"
import { getAuth } from "firebase-admin/auth"
import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js"
import Comment from "./Schema/Comment.js"
import Notification from "./Schema/Notification.js"
import jwt from "jsonwebtoken"
import serviceAccountKey from "./react-js-blog-website-ea231-firebase-adminsdk-fbsvc-2f49fb45da.json" with { type: "json" };
import aws from "aws-sdk"
import { populate } from 'dotenv';


//important notes: Firebase usage, password Hashing, Posting for login
// Initialize express server
const server = express();
server.use(express.json());


//use cors to take in the data from front end 
server.use(cors());
const PORT = 3000;


//Initializing App for Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey)
});


// Connect to MongoDB
mongoose.connect(process.env.DB_LOCATION, { autoIndex: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

//setting the config to send images to the aws bucket 

aws.config.update({
  region: 'us-east-2',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new aws.S3();


//using the random numbers + date make a url using the aws 

const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`

  return await s3.getSignedUrlPromise('putObject', {
    Bucket: 'blogging-website-yt',
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg"
  });

}

//AWS will make us a url incorporating random num+ date and will do this when we use server.get

server.get('/get-upload-url', (req, res) => {
  generateUploadURL().then(url => res.status(200).json({ UploadURL: url }))
    .catch((err) => {
      console.log(err.message)
      return res.status(500).json({ error: err.message })
    })
})





//generate username from the email 

const generateUsername = async (email) => {
  let username = email.split("@")[0];
  let isUsernameUnique = await User.exists({ "personal_info.username": username });

  if (isUsernameUnique) {
    username += nanoid().substring(0, 5);
  }

  return username;
};


const verifyJWT = (req, res, next) => {

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];
  if (token === null) {
    return res.status(401).json({ error: "No access token" })
  }
  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Access token is invalid", token })
    }
    req.user = user.id
    next()
  })
}
//generate the access token

const formatDatatoSend = (user) => {
  const access_token = jsonwebtoken.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);
  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname
  };
};

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

// ✅ SIGNUP ROUTE
server.post("/signup", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // Validate Full Name
    if (!fullname || fullname.length < 3) {
      return res.status(403).json({ error: "Full name must be at least 3 characters long" });
    }

    // Validate Email
    if (!email || !emailRegex.test(email)) {
      return res.status(403).json({ error: "Invalid email address" });
    }

    // Check if Email Already Exists
    const existingUser = await User.findOne({ "personal_info.email": email });
    if (existingUser) {
      return res.status(403).json({ error: "Email is already used! Proceed to sign in" });
    }

    // Validate Password
    if (!passwordRegex.test(password)) {
      return res.status(403).json({
        error: "Password must be 6-20 characters long and include at least one number, one uppercase letter, and one lowercase letter",
      });
    }

    // Hash Password
    const hashed_password = await bcrypt.hash(password, 10);
    const username = await generateUsername(email);

    // Create and Save User
    //schema.save is a mongodb way to save a new schema entry to the database
    const user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });

    await user.save();
    return res.status(200).json(formatDatatoSend(user));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error saving user" });
  }
});

// ✅ SIGNIN ROUTE
server.post("/signin", async (req, res) => {
  try {
    let { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ "personal_info.email": email });
    if (!user) {
      return res.status(403).json({ error: "Email not found" });
    }

    // Compare password
    const result = await bcrypt.compare(password, user.personal_info.password);
    if (!result) {
      return res.status(403).json({ error: "Password entered is incorrect" });
    }

    return res.status(200).json(formatDatatoSend(user));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

server.post("/change-password", verifyJWT, (req, res) => {
  let { currentPassword, newPassword } = req.body;

  // Password validation: both current and new password must meet regex
  if (!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Both passwords must be 6-20 characters long and include at least one number, one uppercase letter, and one lowercase letter"
    });
  }

  // Find the user by ID
  User.findOne({ _id: req.user })
    .then((user) => {
      // Check if user is logged in via Google (can't change password)
      if (user.google_auth) {
        return res.status(403).json({ error: "You cannot change this password because you are logged in via Google" });
      }

      // Compare current password with the stored hashed password
      bcrypt.compare(currentPassword, user.personal_info.password, (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Error occurred while comparing passwords" });
        }

        // If passwords don't match
        if (!result) {
          return res.status(403).json({ error: "Incorrect Current Password" });
        }

        // Hash new password and update user document
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
          if (err) {
            return res.status(500).json({ error: "Error occurred while hashing new password" });
          }

          // Update password in the database
          User.findOneAndUpdate(
            { _id: req.user },
            { "personal_info.password": hashedPassword },
            { new: true } // Return updated document
          )
            .then(() => {
              return res.status(200).json({ status: "Password Changed Successfully" });
            })
            .catch((err) => {
              console.log(err);
              return res.status(500).json({ error: err.message });
            });
        });
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: "User not found" });
    });
});


server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;
  //Authenticate 
  //verifying the token will also retunr the info needed 

  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;
      picture = picture.replace("s96-c", "s384-c");

      //check for the user and then get the full name, username, profile pic, and google auth bool 

      let user = await User.findOne({ "personal_info.email": email })
        .select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u) => {
          return u || null
        }).catch((err) => {
          return res.status(500).json({ "error": err.message })
        });
      //if the user exists but the google bool is false then they alreayd have a normal acc and can't have two 
      if (user) {
        if (!user.google_auth) {
          return res.status(403).json({
            error: "This email was signed up without Google. Please log in with a password to access the account."
          });
        }
      }

      //if user doesnt exist lets make them a username and set their google bool to true  
      else {
        let username = await generateUsername(email);
        user = new User({
          personal_info: { fullname: name, email, profile_img: picture, username },
          google_auth: true
        });

        await user.save()
          .then((u) => {
            user = u
          })
          .catch((err) => {
            console.error("User Creation Error:", err);
            return res.status(500).json({ error: err.message });
          });
      }
      return res.status(200).json(formatDatatoSend(user));
    })
    .catch((error) => {
      console.error("Google Auth Error:", error);
      return res.status(500).json({ error: error.message });
    });


});


server.post('/latest-blogs', async (req, res) => {
  let { page } = req.body;
  let maxlimit = 5;

  // Log the received page number and skip value for debugging
  console.log(`Received page: ${page}`);
  console.log(`Skip value: ${(page - 1) * maxlimit}`);

  Blog.find({ draft: false })
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "PublishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxlimit)
    .limit(maxlimit)
    .then(blogs => {
      return res.status(200).json({ blogs });
    })
    .catch(err => {
      return res.status(500).json({ error: err });
    });
});

server.get('/trending-blogs', (req, res) => {
  Blog.find({ draft: false }).populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id").sort({ "activity.total_read": -1, "activity.total_likes": -1, "publishedAt": -1 })
    .select("blog_id title publishedAt _id")
    .then(blogs => {
      return res.status(200).json({ blogs })
    }).catch((err) => {
      return res.status(500).json({ error: err })
    })

})

server.post("/all-latest-blogs-count", (req, res) => {

  Blog.countDocuments({ draft: false })
    .then(count => {
      res.status(200).json({ totalDocs: count });
    })
    .catch(err => {
      res.status(500).json({ error: err });
    });
});



server.post("/search-blogs-count", (req, res) => {
  let { tag, author, query } = req.body;
  let findQuery = { draft: false };  // Default condition to exclude drafts.

  if (tag) {
    findQuery = { tags: tag, draft: false };  // Filter by tag
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, 'i') };  // Filter by query (title)
  } else if (author) {
    findQuery = { author, draft: false };  // Filter by author
  }

  Blog.countDocuments(findQuery)
    .then(count => {
      return res.status(200).json({ totalDocs: count });  // Return total count of blogs
    })
    .catch(err => {
      return res.status(500).json({ error: err });
    });
});

server.post("/search-blogs", (req, res) => {
  // Declare maxlimit at the start of the function
  let maxlimit = 2; // Default value for maxlimit

  let { tag, query, author, page, limit, eliminate_blog } = req.body;
  let findQuery;

  // Use the provided limit if it exists
  if (limit) {
    maxlimit = limit;
  }

  if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, 'i') };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  Blog.find(findQuery)
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "PublishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxlimit) // Using maxlimit here
    .limit(maxlimit) // Using maxlimit here
    .then(blogs => {
      return res.status(200).json({ blogs });
    })
    .catch(err => {
      return res.status(500).json({ error: err });
    });
});




server.post('/create-blog', verifyJWT, async (req, res) => {
  try {
    let { title, des, banner, tags, content, draft, id } = req.body;
    let authorId = req.user;

    // Validate required fields
    if (!title || !title.length) {
      return res.status(403).json({ error: "You must provide a title to publish the blog" });
    }
    if (!banner || !banner.length) {
      return res.status(403).json({ error: "Please submit a cover photo" });
    }
    if (!content?.blocks?.length) {
      return res.status(403).json({ error: "You forgot to write content in the blog!" });
    }

    // Additional validation for non-draft posts
    if (!draft) {
      if (!des || des.length > 200) {
        return res.status(403).json({ error: "Please type a description within 200 characters" });
      }
      if (!Array.isArray(tags) || tags.length === 0 || tags.length > 10) {
        return res.status(403).json({ error: "Check your tags (must be between 1-10)" });
      }
    }

    // Generate blog_id
    let blog_id = id || title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid();

    // Ensure tags are lowercase
    tags = (tags || []).map(tag => tag.toLowerCase());

    if (id) {
      // Updating an existing blog
      await Blog.findOneAndUpdate(
        { blog_id },
        { title, des, banner, content, tags, draft: Boolean(draft) }
      );

      return res.status(200).json({ id: blog_id });

    } else {
      // Creating a new blog
      let blog = new Blog({
        title, des, banner, content, tags, author: authorId, blog_id, draft: Boolean(draft)
      });

      let savedBlog = await blog.save(); // Wait for the blog to be saved

      let incrementVal = draft ? 0 : 1;

      await User.findOneAndUpdate(
        { _id: authorId },
        { $inc: { "account_info.total_posts": incrementVal }, $push: { "blogs": savedBlog._id } }
      );

      return res.status(200).json({ id: savedBlog.blog_id });
    }
  } catch (err) {
    console.error("Error creating blog:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


server.post("/search-user", (req, res) => {
  let { query } = req.body;
  User.find({ "personal_info.username": new RegExp(query, 'i') })
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
    .then(users => {
      return res.status(200).json({ users })
    }).catch((err) => {
      return res.status(500).json(err)
    })
})

server.post("/get-blog", (req, res) => {
  let { blog_id, draft, mode } = req.body;
  let incrementVal = mode !== "edit" ? 1 : 0; // Define incrementVal

  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementVal } }
  )
    .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
    .select("title des content banner activity publishedAt blog_id tags draft") // Make sure draft is selected
    .then(blog => {
      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      // Handle draft check inside the promise, after blog is found
      if (blog.draft && !draft) {
        return res.status(500).json({ error: "You cannot access this draft" });
      }

      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        { $inc: { "account_info.total_reads": incrementVal } }
      )
        .then(() => {
          return res.status(200).json({ blog });
        })
        .catch(err => {
          return res.status(500).json({ error: "Failed to update user read count" });
        });
    })
    .catch(err => {
      return res.status(500).json({ error: err });
    });
});



server.post("/get-profile", (req, res) => {
  let { username } = req.body

  User.findOne({ "personal_info.username": username })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then(user => {
      return res.status(200).json(user)
    }).catch(err => {
      return res.status(500).json({ error: err })
    })
})
server.post("/like-blog", verifyJWT, async (req, res) => {
  try {
    let user_id = req.user;
    let { _id, isLikedByUser } = req.body;
    let incrementVal = isLikedByUser ? -1 : 1;

    // Update the blog's like count
    let blog = await Blog.findOneAndUpdate(
      { _id },
      { $inc: { "activity.total_likes": incrementVal } },
      { new: true } // Ensure we get the updated document
    );

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Handle like/unlike notifications
    if (!isLikedByUser) {
      let likeNotification = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });
      await likeNotification.save();
    } else {
      await Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" });
    }

    return res.status(200).json({ likedByUser: !isLikedByUser });
  } catch (error) {
    console.error("Error liking blog:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

server.get("/new-notification", verifyJWT, (req, res) => {
  let user_id = req.user;
  Notification.exists({ notification_for: user_id, seen: false, user: { $ne: user_id } })
    .then((result) => {
      console.log('New Notification Check:', result); // Debugging log
      if (result) {
        return res.status(200).json({ new_notification_available: true });
      } else {
        return res.status(200).json({ new_notification_available: false });
      }
    })
    .catch(() => {
      console.log("Error checking new notifications.");
      return res.status(500).json({ error: "Internal server error" });
    });
});

server.post("/notifications", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { page, filter, deletedDocCount } = req.body;
  let maxLimit = 10;
  console.log(user_id)

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  let skipDocs = (page - 1) * maxLimit;

  if (filter != "all") {
    findQuery.type = filter;
  }

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }


  Notification.find(findQuery)
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id")
    .populate("user", "personal_info.fullname personal_info.username personal_info.profile_img")
    .populate("comment", "comment")
    .populate("replied_on_comment", "comment")
    .populate("reply", "comment")
    .sort({ "createdAt": -1 })
    .select("createdAt type seen reply")
    .then(notifications => {

      Notification.updateMany(findQuery, { seen: true })
        .skip(skipDocs)
        .limit(maxLimit)
        .then(() => { console.log("Notification Seen") })
      return res.status(200).json({ notifications });
    })
    .catch(err => {
      console.log("Error fetching notifications:", err.message); // Debugging log
      return res.status(500).json({ error: err.message });
    });
});


server.post("/all-notifications-count", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { filter } = req.body;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  if (filter != "all") {
    findQuery.type = filter;
  }



  Notification.countDocuments(findQuery)
    .then(count => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch(err => {
      console.log("Error counting notifications:", err.message); // Debugging log
      return res.status(500).json({ error: err.message });
    });
});


server.post("/isliked-by-user", verifyJWT, async (req, res) => {
  try {
    let user_id = req.user;
    let { _id } = req.body;
    let result = await Notification.exists({ user: user_id, type: "like", blog: _id });
    return res.status(200).json({ result: !!result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



server.post("/add-comment", verifyJWT, async (req, res) => {  // Marked this as async
  let user_id = req.user;
  let { _id, comment, blog_author, replying_to, notification_id } = req.body;

  if (!comment || comment.trim().length === 0) {
    return res.status(403).json({ error: "Write a comment to submit" });
  }

  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
    isReply: false, // Assuming it's a top-level comment
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  try {
    // **Save the comment first**
    const commentFile = await new Comment(commentObj).save();
    let { comment, commentedAt, children } = commentFile;

    // **Update blog's comment section**
    await Blog.findOneAndUpdate(
      { _id },
      {
        $push: { comments: commentFile._id },
        $inc: { "activity.total_comments": 1, "activity.total_parent_comments": replying_to ? 0 : 1 },
      }
    );
    console.log("New Comment Created");

    let notificationObj = new Notification({
      type: replying_to ? "reply" : "comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment: commentFile._id,
    });

    if (replying_to) {
      notificationObj.replied_on_comment = replying_to;

      const replyToCommentDoc = await Comment.findOneAndUpdate(
        { _id: replying_to },
        { $push: { children: commentFile._id } }
      );

      notificationObj.notification_for = replyToCommentDoc.commented_by;  // Corrected to use `replyToCommentDoc`
    }

    await notificationObj.save();
    console.log("New Notification Created");

    // **Fix: Move notification update here, AFTER commentFile is defined**
    if (notification_id) {
      await Notification.findOneAndUpdate({ _id: notification_id }, { reply: commentFile._id })
        .then(notification => {
          console.log("Notification updated");
        })
        .catch(err => {
          console.error("Error updating notification:", err);
        });
    }

    return res.status(200).json({
      comment,
      commentedAt,
      _id: commentFile._id,
      user_id,
      children,
    });
  } catch (err) {
    console.error("Error saving comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});



server.post("/update-profile-img", verifyJWT, (req, res) => {
  let { url } = req.body;
  User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
    .then(() => {
      return res.status(200).json({ profile_img: url })
    })
    .catch(err => {
      return res.status(500).json(err);
    });

})

server.post("/get-blog-comments", (req, res) => {
  let { blog_id, skip = 0 } = req.body; // Ensure skip has a default value
  let maxlimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
    .skip(skip)
    .limit(maxlimit)
    .sort({ commentedAt: -1 })
    .then(comments => {
      return res.status(200).json(comments); // Fixed typo: 'staus' → 'status'
    })
    .catch(err => {
      return res.status(500).json(err);
    });
});


server.post("/update-profile", verifyJWT, (req, res) => {
  let { username, bio, social_links } = req.body;

  let bioLimit = 150;

  if (username.length < 3) {
    return res.status(403).json({ error: "Username should be 3+ characters long" });
  }
  if (bio.length > bioLimit) {
    return res.status(403).json({ error: `Bio should not exceed ${bioLimit} characters` }); // Fixed wording
  }

  let socialLinksArr = Object.keys(social_links);

  try {
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]].length) { // Fixed condition
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname; // Fixed `Url` to `URL`

        if (!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !== "website") { // Fixed logic
          return res.status(403).json({ error: "Link is invalid" });
        }
      }
    }
  } catch (err) {
    return res.status(500).json({ error: "You must provide full social links including https://" }); // Improved error message
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links
  };

  User.findOneAndUpdate({ _id: req.user }, updateObj, { // Moved options inside method call
    runValidators: true
  })
    .then(() => {
      return res.status(200).json("Account change success");
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});


server.post("/get-replies", (req, res) => {
  let { _id, skip } = req.body;
  let maxLimit = 5;

  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: { // ✅ Corrected 'option' to 'options'
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 } // ✅ Removed unnecessary quotes
      },
      populate: {
        path: "commented_by",
        select: "personal_info.profile_img personal_info.fullname personal_info.username"
      },
      select: "-blog_id -updatedAt"
    })
    .select("children")
    .then((doc) => { // ✅ Fixed incorrect 'replies' parameter
      if (!doc) {
        return res.status(404).json({ error: "Comment not found" });
      }
      return res.status(200).json({ replies: doc.children }); // ✅ Fixed 'doc' reference
    })
    .catch((err) => {
      console.error("Error fetching replies:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    });
});

const deleteComment = (_id) => {
  Comment.findOne({ _id }).then(comment => {

    if (!comment) {

      return;

    }

    if (comment.parent) {

      Comment.findOneAndUpdate(
        { _id: comment.parent },
        { $pull: { children: _id } }
      )
        .then(() => console.log("Comment deleted from parent"))
        .catch(err => console.log(err));
    }

    Notification.findOneAndDelete({ comment: _id })
      .then(() => console.log("Comment notification deleted"))
      .catch(err => console.log("can't", err));

    Notification.findOneAndUpdate({ reply: _id }, { $unset: { reply: 1 } })
      .then(() => console.log("Reply notification deleted"))
      .catch(err => console.log("really cant", err));

    Blog.findOneAndUpdate(
      { _id: comment.blog_id },
      {
        $pull: { comments: _id },
        $inc: {
          "activity.total_comments": -1,
          "activity.total_parent_comments": comment.parent ? 0 : -1
        }
      }
    )
      .then(() => {
        if (comment.children?.length) {
          comment.children.forEach(replies => {
            deleteComment(replies);
          });
        }
      })
      .catch(err => console.log(err));
  })
    .catch(() => {
      return res.status(500).json({ error: "Internal Server Error" });
    });
};

server.post("/delete-comment", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;


  Comment.findOne({ _id })

    .then(comment => {
      if (!comment) {

        return res.status(404).json({ error: "Comment not found" });
      }

      if (user_id == comment.commented_by || user_id == comment.blog_author) {
        console.log("hellppp")

        deleteComment(_id);
        return res.status(200).json({ status: "done" });
      } else {
        return res.status(403).json({ error: "You cannot delete this comment" });
      }
    })
    .catch(() => res.status(500).json({ error: "Internal Server Error" }));
});

server.post("/user-written-blogs", verifyJWT, (req, res) => {

  let user_id = req.user;
  let { page, draft, query, deletedDocCount } = req.body

  let maxLimit = 2;
  let skipDocs = (page - 1) * maxLimit;

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }
  Blog.find({ author: user_id, draft, title: new RegExp(query, 'i') })
    .skip(skipDocs)
    .limit(maxLimit)
    .sort({ publishedAt: -1 })
    .select("title banner publishedAt blog_id activity des draft -_id")
    .then(blogs => {
      return res.status(200).json({ blogs })

    })
    .catch(err => {
      return res.status(500).json({ error: err.message })
    })
})

server.post("/user-written-blogs-count", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { draft, query } = req.body
  Blog.countDocuments({ author: user_id, draft, title: new RegExp(query, 'i') })
    .then(count => {

      return res.status(200).json({ totalDocs: count })

    })
    .catch(err => {
      return res.status(500).json({ error: err.message })
    })
})

server.post("/delete-blog", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { blog_id } = req.body;

  Blog.findOneAndDelete({ blog_id })
    .then((blog) => {
      Notification.deleteMany({ blog: blog._id })
        .then(() => {
          console.log('Notifications deleted');
          Comment.deleteMany({ blog_id: blog._id })
            .then(() => {
              console.log('Comments deleted');
              User.findOneAndUpdate(
                { _id: user_id },
                { $pull: { blog: blog._id }, $inc: { "account_info.total_posts": -1 } }
              )
                .then(() => {
                  console.log("Blog deleted");
                  return res.status(200).json({ message: 'Blog and related data deleted successfully' });
                })
                .catch((err) => {
                  console.error(err);
                  return res.status(500).json({ error: err.message });
                });
            })
            .catch((err) => {
              console.error(err);
              return res.status(500).json({ error: err.message });
            });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: err.message });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.message });
    });
});

// Start server
server.listen(PORT, () => {
  console.log('✅ Server running on port ' + PORT);
});
