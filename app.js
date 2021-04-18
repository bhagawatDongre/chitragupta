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

// Set the bot response
bot.on('text', (ctx) => {
  let text = ctx.message.text;
  formatData = (data)=> {
    if(Array.isArray(data)){
      return db.getData(`/${ctx.message.from.id}`).map((a)=> {
        return a.msg
      }).join(',')
    } else {
      return ''
    }
  }
  switch(text){
    case '/list':
      return ctx.reply(`Here is your list ${formatData(db.getData(`/${ctx.message.from.id}`))}`);
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
