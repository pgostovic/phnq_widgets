var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var S3 = awssum.load('amazon/s3').S3;
var crypto = require("crypto");
var config = require("../config").cdn.s3;
var mime = require('mime');
var _ = require('underscore');
var log = require("phnq_log").create(__filename);

var s3 = null;
var getS3 = function()
{
	if(!s3)
	{
		s3 = new S3(
		{
			"accessKeyId": config.accessKeyId,
			"secretAccessKey": config.secretAccessKey,
			"region": config.region || amazon.US_EAST_1
		});
	}
	return s3;
};

module.exports =
{
	put: function(filename, filedata, fn)
	{
		checkIfExists(filename, filedata, function(exists)
		{
			if(exists)
				return fn();

			var dataBuf = new Buffer(filedata, "UTF-8");

			var contentType = mime.lookup(filename);
			var contentEnc = undefined;
			if(filename.match(/\.gz$/))
			{
				contentType = mime.lookup(filename.replace(/\.gz$/, ""));
				contentEnc = "gzip";
			}

			log.debug("Push to S3: ", filename);

			getS3().PutObject(
			{
				BucketName: config.bucketName,
				ObjectName: filename,
				ContentLength: dataBuf.length,
				ContentType: contentType,
				ContentEncoding: contentEnc,
				CacheControl: "public, max-age=315360000",
		        Acl: "public-read",
				Body: dataBuf
			}, function(err, data)
			{
				if(err)
					return fn(err);

				// update index for this item...
				if(index)
				{
					var hash = crypto.createHash("md5");
					hash.update(filedata, "UTF-8");

					index[filename] =
					{
						size: dataBuf.length,
						md5: hash.digest("hex")
					};
				}

				fn(null);
			});
		});
	},

	getUrlForFile: function(file)
	{
		return "http://"+config.bucketName+".s3.amazonaws.com/"+file;
	}
};

var index = null;
var getBucketIndex = function(fn)
{
	var nowMillis = new Date().getTime();

	if(index && nowMillis < index.___staleTimeMillis)
		return fn(index);

	log.debug("Getting index for bucket: ", config.bucketName);

	getS3().ListObjects(
	{
		BucketName: config.bucketName
	}, function(err, data)
	{
		index = {___staleTimeMillis: nowMillis+(5*60*1000)};
		_.each(data.Body.ListBucketResult.Contents, function(obj)
		{
			index[obj.Key] =
			{
				md5: obj.ETag.replace(/["']/g, ""),
				size: parseInt(obj.Size, 10)
			};
		});

		fn(index);
	});
};

var checkIfExists = function(filename, filedata, fn)
{
	getBucketIndex(function(index)
	{
		var item = index[filename];
		if(!!item && item.size == filedata.length)
		{
			var hash = crypto.createHash("md5");
			hash.update(filedata, "UTF-8");
			fn(item.md5 == hash.digest("hex"));
		}
		else
		{
			fn(false);
		}
	});
};
