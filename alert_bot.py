#!/usr/bin/env python3
"""
Telegram Alert Bot — только отправляет алерты, без кнопок управления
"""
import os
import asyncio
import logging
from telegram import Bot
from telegram.ext import Application, CommandHandler
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

bot = Bot(token=TOKEN)

async def send_alert(site_name: str, url: str, error: str = "Недоступен"):
    """Отправить алерт о падении сайта"""
    text = (
        f"🚨 *АЛЕРТ!*\n"
        f"Сайт *{site_name}* недоступен!\n"
        f"📡 `{url}`\n"
        f"❌ Ошибка: {error}"
    )
    try:
        await bot.send_message(chat_id=CHAT_ID, text=text, parse_mode='Markdown')
        logger.info(f"Alert sent for {site_name}")
    except Exception as e:
        logger.error(f"Failed to send alert: {e}")

async def send_resolved(site_name: str, url: str):
    """Отправить уведомление о восстановлении сайта"""
    text = (
        f"✅ *ОТБОЙ АЛЕРТА*\n"
        f"Сайт *{site_name}* снова доступен!\n"
        f"📡 `{url}`"
    )
    try:
        await bot.send_message(chat_id=CHAT_ID, text=text, parse_mode='Markdown')
        logger.info(f"Resolved alert sent for {site_name}")
    except Exception as e:
        logger.error(f"Failed to send resolved alert: {e}")

async def start_command(update, context):
    """Единственная команда — для проверки, что бот жив"""
    await update.message.reply_text("🖥 Alert Bot активен. Ожидаю алерты...")

def main():
    """Запуск бота"""
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start_command))
    
    logger.info("Alert Bot started!")
    app.run_polling()

if __name__ == '__main__':
    main()