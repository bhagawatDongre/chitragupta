var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var { Telegraf } = require('telegraf');
var { JsonDB } = require('node-json-db');
var { Config } = require('node-json-db/dist/lib/JsonDBConfig')

const db = new JsonDB(new Config("items", true, false, '/'));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use('/send', function(req, res, next) {
  app.telegram.sendMessage("Today is" + new Date() + " is: \n");
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

const token = process.env.BOT_TOKEN;

if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

function groupBy(key, array) {
  var result = [];
  for (var i = 0; i < array.length; i++) {
    var added = false;
    for (var j = 0; j < result.length; j++) {
      if (result[j][key] == array[i][key]) {
        result[j].items.push(array[i]);
        added = true;
        break;
      }
    }
    if (!added) {
      var entry = {items: []};
      entry[key] = array[i][key];
      entry.items.push(array[i]);
      result.push(entry);
    }
  }
  return result;
}

bot.start((ctx) => ctx.reply('Welcome'))

// Set the bot response
bot.on('text', (ctx) => {
  let text = ctx.message.text;

  formatData = (data)=> {
    if(Array.isArray(data)){
      let groupedData = groupBy('category' , data);

     return groupedData.map((elem)=>elem.category || 'Uncategorized').join(', ')
    } else {
      return ''
    }
  }
  switch(text){
    case '/list':
      let a = formatData(db.getData(`/${ctx.message.from.id}`));
      ctx.replyWithHTML(`<b>${a}</b>`);
      break;
    default:
      db.push(
        `/${ctx.message.from.id}[]`, 
        {
          id: ctx.message.message_id, 
          msg: ctx.message.text,
          category: ctx.message.text && Array.isArray(ctx.message.text.match(/#[a-z]+/gi))
           ? ctx.message.text.match(/#[a-z]+/gi).join(' ') 
           :
            ''
        },
        true
      )
      ctx.reply("\u{2705}");
    break;
  }

});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

bot.launch()

module.exports = app;
