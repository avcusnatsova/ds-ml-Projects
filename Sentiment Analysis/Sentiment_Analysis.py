# Teen Mental Health Dashboard - Pink & Violet Theme


import pandas as pd
import numpy as np
from datetime import datetime
import dash
from dash import dcc, html, Input, Output
import dash_bootstrap_components as dbc
import plotly.express as px
import nltk
import re
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from transformers import pipeline
import warnings
warnings.filterwarnings('ignore')

# Download VADER lexicon if needed
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')

# ----------------- TeenMentalHealthAnalyzer -----------------
class TeenMentalHealthAnalyzer:
    def __init__(self):
        self.setup_models()
        self.setup_patterns()
    
    def setup_models(self):
        print("Loading models...")
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="nlptown/bert-base-multilingual-uncased-sentiment",
            return_all_scores=True
        )
        self.mental_health_analyzer = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            return_all_scores=True
        )
        try:
            self.sarcasm_detector = pipeline(
                "text-classification",
                model="helinivan/english-sarcasm-detector",
                return_all_scores=True
            )
        except:
            self.sarcasm_detector = None
        self.vader_analyzer = SentimentIntensityAnalyzer()
        print("Models loaded successfully!")

    def setup_patterns(self):
        self.depression_keywords = ['depressed','sad','empty','worthless','hopeless','alone','tired','exhausted','numb','pain','hurt','crying','tears','give up','no point','meaningless','isolated','lonely']
        self.anxiety_keywords = ['anxious','worried','nervous','panic','scared','fear','overthinking','stress','overwhelmed','tense','restless']
        self.self_harm_keywords = ['cut','cutting','hurt myself','end it','disappear','gone']
        self.positive_keywords = ['happy','excited','good','great','awesome','love','fun','amazing','perfect','blessed','grateful','smile','laugh']
        self.sarcasm_patterns = [r'[A-Z]{3,}', r'\.{3,}', r'!{2,}', r'\?{2,}', r'(?:oh\s+)?(?:wow|great|fantastic|wonderful)(?:\s+/s)?', r'sure\s+thing', r'yeah\s+right', r'of\s+course']

    def analyze_message(self, text):
        if pd.isna(text) or text.strip() == '':
            return self.empty_analysis()
        text = str(text).lower()
        # BERT sentiment
        bert_result = self.sentiment_analyzer(text)
        bert_sentiment = max(bert_result[0], key=lambda x: x['score'])
        # Emotions
        emotions = self.mental_health_analyzer(text)[0]
        # VADER
        vader_scores = self.vader_analyzer.polarity_scores(text)
        # Sarcasm
        sarcasm_score = self.detect_sarcasm(text)
        # Keywords
        depression_score = self.calculate_keyword_score(text, self.depression_keywords)
        anxiety_score = self.calculate_keyword_score(text, self.anxiety_keywords)
        self_harm_score = self.calculate_keyword_score(text, self.self_harm_keywords)
        positive_score = self.calculate_keyword_score(text, self.positive_keywords)
        # Risk
        mental_health_risk = self.calculate_mental_health_risk(
            depression_score, anxiety_score, self_harm_score, positive_score,
            vader_scores['compound'], emotions
        )
        return {
            'bert_sentiment': bert_sentiment['label'],
            'bert_confidence': bert_sentiment['score'],
            'primary_emotion': max(emotions, key=lambda x: x['score'])['label'],
            'emotion_confidence': max(emotions, key=lambda x: x['score'])['score'],
            'vader_compound': vader_scores['compound'],
            'vader_positive': vader_scores['pos'],
            'vader_negative': vader_scores['neg'],
            'vader_neutral': vader_scores['neu'],
            'sarcasm_score': sarcasm_score,
            'depression_score': depression_score,
            'anxiety_score': anxiety_score,
            'self_harm_score': self_harm_score,
            'positive_score': positive_score,
            'mental_health_risk': mental_health_risk,
            'all_emotions': {e['label']: e['score'] for e in emotions}
        }

    def empty_analysis(self):
        return {'bert_sentiment':'NEUTRAL','bert_confidence':0.5,'primary_emotion':'neutral','emotion_confidence':0.5,'vader_compound':0,'vader_positive':0,'vader_negative':0,'vader_neutral':1,'sarcasm_score':0,'depression_score':0,'anxiety_score':0,'self_harm_score':0,'positive_score':0,'mental_health_risk':0,'all_emotions':{}}

    def detect_sarcasm(self, text):
        if self.sarcasm_detector:
            try:
                result = self.sarcasm_detector(text)[0]
                for item in result:
                    if 'sarcastic' in item['label'].lower() or 'sarc' in item['label'].lower():
                        return item['score']
                return 0
            except:
                pass
        score = 0
        for pattern in self.sarcasm_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.3
        return min(score,1.0)

    def calculate_keyword_score(self, text, keywords):
        words = text.split()
        score = sum(1 for word in words if any(keyword in word for keyword in keywords))
        return min(score/len(words) if words else 0,1.0)

    def calculate_mental_health_risk(self, depression_score, anxiety_score, self_harm_score, positive_score, vader_compound, emotions):
        risk_factors = [depression_score*0.3, anxiety_score*0.2, self_harm_score*0.4, max(0,-vader_compound)*0.1]
        emotion_risk = 0
        for emotion in emotions:
            if emotion['label'] in ['sadness','fear','anger']:
                emotion_risk += emotion['score']*0.15
        risk_factors.append(emotion_risk)
        positive_reduction = positive_score*0.2
        total_risk = sum(risk_factors)-positive_reduction
        return max(0,min(total_risk,1.0))

    def analyze_dataframe(self, df):
        print("Analyzing messages...")
        results=[]
        for idx,row in df.iterrows():
            analysis=self.analyze_message(row['Message'])
            analysis['Message_ID']=row['Message ID']
            analysis['Timestamp']=row['Timestamp']
            analysis['Platform']=row['Platform']
            analysis['Is_Late_Night']=row['Is Late Night']
            analysis['Hour']=row['Hour']
            analysis['Weekday']=row['Weekday']
            analysis['original_mood']=row['Mood']
            results.append(analysis)
            if idx%50==0:
                print(f"Processed {idx+1}/{len(df)} messages")
        analysis_df=pd.DataFrame(results)
        analysis_df['Timestamp']=pd.to_datetime(analysis_df['Timestamp'])
        if pd.api.types.is_datetime64tz_dtype(analysis_df['Timestamp']):
            analysis_df['Timestamp']=analysis_df['Timestamp'].dt.tz_localize(None)
        analysis_df['Date']=analysis_df['Timestamp'].dt.date
        print("Analysis complete!")
        return analysis_df

# ----------------- TeenDashboard -----------------
class TeenDashboard:
    def __init__(self, analysis_df):
        self.df = analysis_df
        # Pink & Violet theme
        self.app = dash.Dash(__name__, external_stylesheets=[dbc.themes.LUX])
        self.setup_layout()
        self.setup_callbacks()
    
    def setup_layout(self):
        self.app.layout = dbc.Container([
            html.H1("Teen Mental Health Dashboard", className="text-center mt-3 mb-3", style={'color':'#FF1493'}),
            dbc.Row([
                dbc.Col(dbc.Card([dbc.CardBody([html.H5("Avg Mental Health Risk"), html.H2(f"{self.df['mental_health_risk'].mean():.2f}")])], color="purple", inverse=True), width=3),
                dbc.Col(dbc.Card([dbc.CardBody([html.H5("Avg Depression Score"), html.H2(f"{self.df['depression_score'].mean():.2f}")])], color="pink", inverse=True), width=3),
                dbc.Col(dbc.Card([dbc.CardBody([html.H5("Avg Anxiety Score"), html.H2(f"{self.df['anxiety_score'].mean():.2f}")])], color="purple", inverse=True), width=3),
                dbc.Col(dbc.Card([dbc.CardBody([html.H5("Avg Self Harm Score"), html.H2(f"{self.df['self_harm_score'].mean():.2f}")])], color="pink", inverse=True), width=3)
            ]),
            html.Hr(),
            dbc.Row([
                dbc.Col(dcc.Graph(id="risk_over_time"), width=12)
            ]),
            dbc.Row([
                dbc.Col(dcc.Graph(id="overnight_timeline"), width=6),
                dbc.Col(dcc.Graph(id="most_used_app"), width=6)
            ])
        ], fluid=True)

    def setup_callbacks(self):
        @self.app.callback(
            Output("risk_over_time", "figure"),
            Input("risk_over_time", "id")
        )
        def update_risk_over_time(_):
            fig = px.line(
                self.df.groupby('Date')['mental_health_risk'].mean().reset_index(),
                x='Date', y='mental_health_risk',
                title="Average Mental Health Risk Over Time",
                markers=True
            )
            fig.update_layout(plot_bgcolor="#F8EAF6", paper_bgcolor="#F8EAF6")
            return fig

        @self.app.callback(
            Output("overnight_timeline", "figure"),
            Input("overnight_timeline", "id")
        )
        def update_overnight_timeline(_):
            overnight_df = self.df[self.df['Is_Late_Night']==True]
            timeline = overnight_df.groupby('Date').size().reset_index(name='Overnight_Messages')
            fig = px.line(
                timeline, x='Date', y='Overnight_Messages',
                title="Overnight Messages Timeline", markers=True
            )
            fig.update_layout(plot_bgcolor="#F8EAF6", paper_bgcolor="#F8EAF6")
            return fig

        @self.app.callback(
            Output("most_used_app", "figure"),
            Input("most_used_app", "id")
        )
        def update_most_used_app(_):
            app_counts = self.df['Platform'].value_counts().reset_index()
            app_counts.columns = ['Platform', 'Message_Count']
            fig = px.bar(
                app_counts, x='Platform', y='Message_Count',
                title="Most Used App",
                color='Message_Count', color_continuous_scale=['#FF69B4','#BA55D3']
            )
            fig.update_layout(plot_bgcolor="#F8EAF6", paper_bgcolor="#F8EAF6")
            return fig

# ----------------- Main Execution -----------------
if __name__ == "__main__":
    df = pd.read_excel("SA_dataset.xlsx")  # your dataset
    analyzer = TeenMentalHealthAnalyzer()
    analysis_df = analyzer.analyze_dataframe(df)
    dashboard = TeenDashboard(analysis_df)
    dashboard.app.run(debug=True)
