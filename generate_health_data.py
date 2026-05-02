import csv
import random
from datetime import datetime, timedelta

# Set random seed for reproducibility
random.seed(42)

NUM_ROWS = 1000
USERS = [f"user_{i:03d}" for i in range(1, 76)]
APPS = ["WhatsApp", "Instagram", "Snapchat", "Discord", "Telegram", "Messenger"]

MESSAGES = {
    'positive': ["I had fun with my friends", "I am happy today", "That was hilarious", "Can't wait for the weekend", "Loved the movie", "Best day ever", "You're the best", "Feeling great today", "Having the best time"],
    'neutral': ["What time is it?", "Are we still on for later?", "Okay", "I'll be there in 5", "Did you do the homework?", "See you tomorrow", "On my way", "Just woke up", "Can you send me the link?"],
    'stressed': ["School is stressing me out", "I'm worried about exams", "So much homework", "I can't deal with this right now", "I have so much to do", "I'm so far behind", "My parents are so annoying"],
    'anxious': ["Everything feels overwhelming", "I don't know what to do", "I'm so nervous", "My chest feels tight", "I can't stop thinking about it", "What if it goes wrong?", "Please reply, I'm worrying"],
    'depressed': ["I feel really tired today", "I don't feel like talking to anyone", "I feel really alone sometimes", "What's the point", "I just want to stay in bed", "I feel empty", "Nothing matters"],
    'lonely': ["I feel really alone sometimes", "Nobody understands", "Wish I had someone to talk to", "Everyone is hanging out without me", "Feeling left out", "I have no real friends", "Why am I always alone"],
    'overwhelmed': ["Everything feels overwhelming", "I can't sleep again tonight", "It's all too much", "I need a break", "Trying to keep it together", "I'm drowning in work"]
}

end_date = datetime.now()
start_date = end_date - timedelta(days=60)

hours_weights = []
for h in range(24):
    if 9 <= h < 15:
        hours_weights.append(0.5) # Reduced during school hours
    elif 18 <= h < 22:
        hours_weights.append(2.0) # Evening spike
    elif 0 <= h < 5:
        hours_weights.append(0.8) # Overnight
    else:
        hours_weights.append(1.0) # Normal

def weighted_choice(choices, weights):
    total = sum(weights)
    r = random.uniform(0, total)
    upto = 0
    for c, w in zip(choices, weights):
        if upto + w >= r:
            return c
        upto += w
    return choices[-1]

data = []
for _ in range(NUM_ROWS):
    random_days = random.randint(0, 59)
    random_hour = weighted_choice(list(range(24)), hours_weights)
    random_minute = random.randint(0, 59)
    random_second = random.randint(0, 59)
    
    ts = start_date + timedelta(days=random_days)
    ts = ts.replace(hour=random_hour, minute=random_minute, second=random_second)
    
    hour = ts.hour
    day_of_week = ts.strftime('%A')
    is_overnight = 0 <= hour < 5
    is_school_hours = 9 <= hour < 15
    is_evening = 18 <= hour < 22
    is_weekday = ts.weekday() < 5
    
    categories = ['positive', 'neutral', 'stressed', 'anxious', 'depressed', 'lonely', 'overwhelmed']
    weights = [0.2, 0.3, 0.1, 0.1, 0.1, 0.1, 0.1]
    
    if is_overnight:
        # Pattern 1: Higher negative sentiment during late-night hours
        weights = [0.05, 0.10, 0.1, 0.15, 0.30, 0.15, 0.15]
    if is_weekday:
        # Pattern 2: Increased anxiety messages during weekdays
        weights[3] += 0.2
        weights[2] += 0.1
        
    category = weighted_choice(categories, weights)
    message_text = random.choice(MESSAGES[category])
    
    if category in ['positive', 'neutral']:
        sentiment_score = random.uniform(0.5, 1.0)
        depression_score = random.uniform(0.0, 0.2)
        anxiety_score = random.uniform(0.0, 0.2)
        self_harm_score = random.uniform(0.0, 0.05)
    else:
        sentiment_score = random.uniform(0.0, 0.4)
        if category == 'depressed':
            depression_score = random.uniform(0.5, 0.9)
            anxiety_score = random.uniform(0.2, 0.6)
        elif category == 'anxious':
            anxiety_score = random.uniform(0.6, 0.9)
            depression_score = random.uniform(0.2, 0.6)
        else:
            depression_score = random.uniform(0.3, 0.6)
            anxiety_score = random.uniform(0.3, 0.6)
            
        if category == 'lonely':
            depression_score += 0.2
            
        self_harm_score = random.uniform(0.0, 0.2)
        
    depression_score = min(1.0, depression_score)
    anxiety_score = min(1.0, anxiety_score)
        
    # Pattern 3: Occasional spikes
    if random.random() < 0.02:
        depression_score = random.uniform(0.8, 1.0)
        self_harm_score = random.uniform(0.6, 0.9)
        sentiment_score = random.uniform(0.0, 0.1)
        
    if is_overnight:
        sentiment_score = max(0, sentiment_score - 0.2)
        depression_score = min(1.0, depression_score + 0.1)
        
    # Overall risk score calculation matching prompt exact weighting
    overall_risk_score = (0.4 * depression_score) + (0.35 * anxiety_score) + (0.25 * self_harm_score)
    
    message_count = random.randint(1, 25)
    
    data.append({
        'timestamp': ts,
        'user_id': random.choice(USERS),
        'app_name': random.choice(APPS),
        'message_text': message_text,
        'message_count': message_count,
        'hour': hour,
        'day_of_week': day_of_week,
        'is_overnight': str(is_overnight).upper(),
        'sentiment_score': round(sentiment_score, 4),
        'depression_score': round(depression_score, 4),
        'anxiety_score': round(anxiety_score, 4),
        'self_harm_score': round(self_harm_score, 4),
        'overall_risk_score': round(overall_risk_score, 4)
    })

# Sort chronologically
data.sort(key=lambda x: x['timestamp'])

keys = [
    'timestamp', 'user_id', 'app_name', 'message_text', 'message_count', 'hour', 
    'day_of_week', 'is_overnight', 'sentiment_score', 'depression_score', 
    'anxiety_score', 'self_harm_score', 'overall_risk_score'
]

csv_file = "teen_mental_health_dataset.csv"
with open(csv_file, 'w', newline='', encoding='utf-8') as output_file:
    dict_writer = csv.DictWriter(output_file, fieldnames=keys)
    dict_writer.writeheader()
    for row in data:
        row['timestamp'] = row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        dict_writer.writerow(row)

print("Dataset generated successfully in " + csv_file)
